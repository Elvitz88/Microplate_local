import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface PasswordResetEmailData {
  email: string;
  userName?: string;
  resetToken: string;
  expiresInMinutes: number;
}

class EmailService {
  private transporter: Transporter;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(config.smtp.host && config.smtp.user && config.smtp.pass);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    } else {
      console.warn('[EmailService] SMTP not configured. Emails will be logged to console.');
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: config.smtp.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      if (!this.isConfigured) {
        console.log('[EmailService] Email would be sent (SMTP not configured):');
        console.log(`  To: ${options.to}`);
        console.log(`  Subject: ${options.subject}`);
        console.log(`  Content: ${options.text || this.stripHtml(options.html).substring(0, 200)}...`);
        return true;
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent successfully to ${options.to}. MessageId: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${data.resetToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin: 0; font-size: 24px;">Microplate AI System</h1>
      </div>

      <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>

      <p style="color: #666; line-height: 1.6;">Hello ${data.userName || data.email.split('@')[0]},</p>

      <p style="color: #666; line-height: 1.6;">
        We received a request to reset the password for your account associated with <strong>${data.email}</strong>.
      </p>

      <p style="color: #666; line-height: 1.6;">
        Click the button below to reset your password:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
           style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <p style="color: #666; line-height: 1.6; font-size: 14px;">
        Or copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          <strong>Important:</strong> This link will expire in ${data.expiresInMinutes} minutes.
        </p>
      </div>

      <p style="color: #666; line-height: 1.6;">
        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        This is an automated message from Microplate AI System. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: data.email,
      subject: 'Password Reset Request - Microplate AI System',
      html,
    });
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[EmailService] SMTP not configured, skipping verification');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('[EmailService] SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP connection verification failed:', error);
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

export const emailService = new EmailService();
