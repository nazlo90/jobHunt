import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

export interface GoogleUserPayload {
  googleId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findById(id: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<User> {
    const user = this.usersRepo.create({
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name ?? null,
      provider: 'local',
      emailVerified: false,
    });
    return this.usersRepo.save(user);
  }

  async findOrCreateGoogleUser(payload: GoogleUserPayload): Promise<User> {
    // Check if Google account already exists
    let user = await this.usersRepo.findOne({
      where: { googleId: payload.googleId },
    });
    if (user) return user;

    // Check if local account with same email exists → link Google to it
    user = await this.usersRepo.findOne({ where: { email: payload.email } });
    if (user) {
      user.googleId = payload.googleId;
      if (!user.avatarUrl && payload.avatarUrl) {
        user.avatarUrl = payload.avatarUrl;
      }
      user.emailVerified = true;
      return this.usersRepo.save(user);
    }

    // New user — create via Google
    const newUser = this.usersRepo.create({
      email: payload.email,
      passwordHash: null,
      name: payload.name,
      provider: 'google',
      googleId: payload.googleId,
      avatarUrl: payload.avatarUrl,
      emailVerified: true,
    });
    return this.usersRepo.save(newUser);
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.usersRepo.update(userId, { passwordHash });
  }

  async setEmailVerified(userId: number): Promise<void> {
    await this.usersRepo.update(userId, {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
    });
  }

  async setEmailVerifyToken(
    userId: number,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.usersRepo.update(userId, {
      emailVerifyToken: token,
      emailVerifyExpires: expires,
    });
  }

  async setResetToken(
    userId: number,
    tokenHash: string,
    expires: Date,
  ): Promise<void> {
    await this.usersRepo.update(userId, {
      resetTokenHash: tokenHash,
      resetTokenExpires: expires,
    });
  }

  async clearResetToken(userId: number): Promise<void> {
    await this.usersRepo.update(userId, {
      resetTokenHash: null,
      resetTokenExpires: null,
    });
  }

  findByResetTokenHash(hash: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('u')
      .where('u.reset_token_hash = :hash', { hash })
      .andWhere('u.reset_token_expires > :now', { now: new Date() })
      .getOne();
  }

  findByEmailVerifyToken(token: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('u')
      .where('u.email_verify_token = :token', { token })
      .andWhere('u.email_verify_expires > :now', { now: new Date() })
      .getOne();
  }
}
