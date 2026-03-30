import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('BREVO_SMTP_USER');
    const pass = this.config.get<string>('BREVO_SMTP_PASS');
    this.from = this.config.get<string>('EMAIL_FROM', 'noreply@jobhunt.app');
    this.frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'BREVO_SMTP_USER / BREVO_SMTP_PASS not set — emails will be logged to console only',
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
    if (!this.transporter) {
      this.logger.log(
        `[EMAIL] To: ${to} | Subject: ${subject}\n${html.replace(/<[^>]+>/g, '')}`,
      );
      return;
    }

    try {
      const info = await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      throw err;
    }
  }
}
