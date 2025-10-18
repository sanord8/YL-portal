/**
 * Email Service
 *
 * Development: Logs emails to console
 * Production: TODO - Integrate with SendGrid, Resend, or AWS SES
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send an email
 * In development, logs to console
 * In production, sends via email provider
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, text, html } = options;

  if (process.env.NODE_ENV === 'development') {
    console.log('\n📧 ============ EMAIL SENT ============');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    console.log('=====================================\n');
    return;
  }

  // TODO: Integrate with email provider
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: process.env.EMAIL_FROM || 'noreply@ylportal.com',
  //   to,
  //   subject,
  //   html,
  // });

  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   from: process.env.EMAIL_FROM || 'noreply@ylportal.com',
  //   to,
  //   subject,
  //   text,
  //   html,
  // });

  throw new Error('Email sending not configured for production');
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${token}`;

  await sendEmail({
    to,
    subject: 'Verify your YoungLife Portal account',
    text: `Hi ${name},\n\nPlease verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #90c83c; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #90c83c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>YoungLife Portal</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hi ${name},</p>
            <p>Thanks for signing up for YoungLife Portal! Please verify your email address by clicking the button below:</p>
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} YoungLife Portal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

  await sendEmail({
    to,
    subject: 'Reset your YoungLife Portal password',
    text: `Hi ${name},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email and your password will remain unchanged.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #90c83c; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #90c83c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>YoungLife Portal</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hi ${name},</p>
            <p>You requested to reset your password for your YoungLife Portal account. Click the button below to reset it:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security.
            </div>
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            <p>If you're having trouble, please contact support.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} YoungLife Portal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
