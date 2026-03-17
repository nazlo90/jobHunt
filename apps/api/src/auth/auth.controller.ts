import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { User } from '../database/entities/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

const COOKIE_NAME = 'refresh_token';

@Controller('auth')
export class AuthController {
  private readonly refreshExpiryDays: number;
  private readonly frontendUrl: string;

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {
    this.refreshExpiryDays = Number(
      this.config.get<string>('REFRESH_TOKEN_EXPIRY_DAYS', '7'),
    );
    this.frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
  }

  // ─── Register ──────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.auth.register(
      dto.email,
      dto.password,
      dto.name,
    );
    // Issue refresh token for the newly registered user
    const user = (await this.auth.validateLocalUser(dto.email, dto.password))!;
    await this.setRefreshCookie(res, user);
    return { accessToken };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Req() req: Request & { user: User },
    @Res({ passthrough: true }) res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() _dto: LoginDto,
  ) {
    const user = req.user;
    await this.setRefreshCookie(res, user);
    return { accessToken: this.auth.signJwt(user) };
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken: string | undefined = (req.cookies as Record<string, string>)[COOKIE_NAME];
    if (!rawToken) {
      res.clearCookie(COOKIE_NAME, { path: '/api/auth/refresh' });
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, newRaw } = await this.auth.refresh(rawToken);
    this.setCookieRaw(res, newRaw);
    return { accessToken };
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken: string | undefined = (req.cookies as Record<string, string>)[COOKIE_NAME];
    await this.auth.logout(rawToken);
    res.clearCookie(COOKIE_NAME, { path: '/api/auth/refresh' });
  }

  // ─── Me ───────────────────────────────────────────────────────────────────

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.auth.me(user);
  }

  // ─── Forgot / Reset password ───────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: 'Password updated successfully.' };
  }

  // ─── Email verification ────────────────────────────────────────────────────

  @Public()
  @Get('verify-email')
  async verifyEmail(@Req() req: Request, @Res() res: Response) {
    const token = (req.query as Record<string, string>)['token'];
    try {
      await this.auth.verifyEmail(token);
      res.redirect(`${this.frontendUrl}/dashboard?verified=1`);
    } catch {
      res.redirect(`${this.frontendUrl}/auth/login?error=invalid_token`);
    }
  }

  // ─── Google SSO ────────────────────────────────────────────────────────────

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleLogin() {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response,
  ) {
    const user = req.user;
    const accessToken = this.auth.signJwt(user);
    await this.setRefreshCookie(res, user);
    res.redirect(`${this.frontendUrl}/auth/callback?token=${accessToken}`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async setRefreshCookie(res: Response, user: User): Promise<void> {
    const raw = await this.auth.issueRefreshToken(user);
    this.setCookieRaw(res, raw);
  }

  private setCookieRaw(res: Response, raw: string): void {
    res.cookie(COOKIE_NAME, raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: this.refreshExpiryDays * 86400 * 1000,
    });
  }
}
