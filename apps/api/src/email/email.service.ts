import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.config.get<string>('EMAIL_FROM', 'noreply@jobhunt.app');
    this.frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );

    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY not set — emails will be logged to console only',
      );
    }
  }

  async sendPasswordReset(to: string, rawToken: string): Promise<void> {
    const link = `${this.frontendUrl}/auth/reset-password?token=${rawToken}`;
    const html = `
      <p>You requested a password reset for your JobHunt account.</p>
      <p><a href="${link}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `;

    await this.send(to, 'Reset your JobHunt password', html);
  }

  async sendEmailVerification(to: string, rawToken: string): Promise<void> {
    const link = `${this.frontendUrl}/auth/verify-email?token=${rawToken}`;
    const html = `
      <p>Welcome to JobHunt! Please verify your email address.</p>
      <p><a href="${link}">Verify my email</a></p>
      <p>This link expires in 24 hours.</p>
    `;

    await this.send(to, 'Verify your JobHunt email', html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(
        `[EMAIL] To: ${to} | Subject: ${subject}\n${html.replace(/<[^>]+>/g, '')}`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      this.logger.error(`Failed to send email to ${to}: ${JSON.stringify(error)}`);
      throw new Error(error.message);
    }
  }
}
