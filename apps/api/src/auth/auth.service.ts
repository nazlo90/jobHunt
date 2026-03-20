import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import { User } from '../database/entities/user.entity';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly refreshExpiryDays: number;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly rtRepo: Repository<RefreshToken>,
  ) {
    this.refreshExpiryDays = Number(
      this.config.get<string>('REFRESH_TOKEN_EXPIRY_DAYS', '7'),
    );
  }

  // ─── Validate local credentials ────────────────────────────────────────────

  async validateLocalUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  // ─── Register ──────────────────────────────────────────────────────────────

  async register(
    email: string,
    password: string,
    name?: string,
  ): Promise<{ accessToken: string }> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        existing.googleId
          ? 'An account with this email already exists. Please sign in with Google.'
          : 'Email already registered.',
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.users.create({ email, passwordHash, name });

    // Send verification email (fire-and-forget)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.users.setEmailVerifyToken(user.id, verifyToken, verifyExpires);
    this.email.sendEmailVerification(user.email, verifyToken).catch(() => null);

    return { accessToken: this.signJwt(user) };
  }

  // ─── Issue tokens ──────────────────────────────────────────────────────────

  signJwt(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload);
  }

  async issueRefreshToken(user: User): Promise<string> {
    const raw = crypto.randomBytes(64).toString('hex');
    const hash = sha256(raw);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + this.refreshExpiryDays * 86400 * 1000,
    );

    await this.rtRepo.save(
      this.rtRepo.create({
        tokenHash: hash,
        familyId,
        userId: user.id,
        expiresAt,
      }),
    );
    return raw;
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  async refresh(
    rawToken: string,
  ): Promise<{ accessToken: string; newRaw: string }> {
    const hash = sha256(rawToken);
    const rt = await this.rtRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });

    if (!rt) throw new UnauthorizedException('Invalid refresh token');

    if (rt.revoked) {
      // Stolen token reuse detected — revoke entire family
      await this.rtRepo.update(
        { familyId: rt.familyId },
        { revoked: true, revokedAt: new Date() },
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (rt.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old, issue new (same family)
    await this.rtRepo.update(rt.id, { revoked: true, revokedAt: new Date() });

    const newRaw = crypto.randomBytes(64).toString('hex');
    const newHash = sha256(newRaw);
    const expiresAt = new Date(
      Date.now() + this.refreshExpiryDays * 86400 * 1000,
    );
    await this.rtRepo.save(
      this.rtRepo.create({
        tokenHash: newHash,
        familyId: rt.familyId,
        userId: rt.userId,
        expiresAt,
      }),
    );

    return { accessToken: this.signJwt(rt.user), newRaw };
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const hash = sha256(rawToken);
    await this.rtRepo.update(
      { tokenHash: hash },
      { revoked: true, revokedAt: new Date() },
    );
  }

  // ─── Forgot / Reset password ───────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    // Always resolve without error to prevent email enumeration
    if (!user || !user.passwordHash) return;

    const raw = crypto.randomBytes(32).toString('hex');
    const hash = sha256(raw);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.users.setResetToken(user.id, hash, expires);
    await this.email.sendPasswordReset(user.email, raw);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hash = sha256(rawToken);
    const user = await this.users.findByResetTokenHash(hash);
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.updatePassword(user.id, passwordHash);
    await this.users.clearResetToken(user.id);

    // Revoke all refresh tokens for this user
    await this.rtRepo.update(
      { userId: user.id, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );
  }

  // ─── Email verification ────────────────────────────────────────────────────

  async verifyEmail(rawToken: string): Promise<void> {
    const user = await this.users.findByEmailVerifyToken(rawToken);
    if (!user)
      throw new BadRequestException('Invalid or expired verification link');
    await this.users.setEmailVerified(user.id);
  }

  // ─── Me ───────────────────────────────────────────────────────────────────

  me(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
    };
  }

  // ─── Update Profile ────────────────────────────────────────────────────────

  async updateProfile(userId: number, data: { name?: string; avatarUrl?: string }) {
    const updated = await this.users.updateProfile(userId, data);
    return this.me(updated);
  }

  // ─── Change Password ───────────────────────────────────────────────────────

  async changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
    if (!user.passwordHash) {
      throw new BadRequestException('Password change is not available for social login accounts.');
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect.');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.updatePassword(user.id, passwordHash);
  }
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
