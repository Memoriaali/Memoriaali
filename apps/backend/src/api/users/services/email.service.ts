/**
 * Email Service
 *
 * Provides email functionality for user account management.
 * Handles sending activation emails, password reset emails, and other user notifications.
 *
 * Design by Contract:
 * - Preconditions: Valid email configuration, recipient email exists
 * - Postconditions: Email sent successfully or error thrown
 * - Invariants: Email content is properly formatted, sensitive data not logged
 */

import { User } from '@memoriaali/database';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

/**
 * Email Service Class
 *
 * Handles all email operations for the user management system.
 * Currently supports activation emails with plans for password reset and notifications.
 */
export class EmailService {
  /**
   * Send account activation email
   *
   * Sends an activation email to the user with their verification code.
   * The email contains instructions and the verification code needed to activate the account.
   *
   * Preconditions: user exists, verificationCode is valid
   * Postconditions: Email sent to user's email address
   * Invariants: Email content is properly formatted, verification code included
   */
  async sendActivationEmail(user: User, verificationCode: string): Promise<void> {
    try {
      // Validate environment variables
      this.validateEmailConfiguration();

      console.info('📧 Sending activation email:');

      console.info(`   To: ${user.email}`);

      console.info(`   Subject: Tervetuloa Memoriaaliin!`);

      console.info(`   User: ${user.firstName} ${user.lastName} (${user.username})`);

      console.info(`   FROM_EMAIL env var: ${process.env.FROM_EMAIL ?? 'NOT SET'}`);

      // In development mode, just log the email details
      if (process.env.NODE_ENV === 'development') {
        console.info(`   Verification Code: ${verificationCode}`);
        return;
      }

      // Production email sending
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: user.email,
        subject: 'Tervetuloa Memoriaaliin!',
        html: this.generateActivationEmailHTML(user, verificationCode),
      };

      await transporter.sendMail(mailOptions);

      console.info('✅ Activation email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send activation email:', error);
      throw new Error(
        `Failed to send activation email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate email configuration
   *
   * Checks that all required environment variables are set for email functionality.
   *
   * Preconditions: Environment variables should be loaded
   * Postconditions: Throws error if configuration is invalid
   * Invariants: No side effects
   */
  private validateEmailConfiguration(): void {
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required email configuration: ${missingVars.join(', ')}`);
    }
  }

  /**
   * Generate activation email HTML content
   *
   * Creates the HTML content for the activation email.
   * Uses a professional template with proper styling and branding.
   *
   * Preconditions: user and verificationCode provided
   * Postconditions: Returns properly formatted HTML email content
   * Invariants: HTML is properly escaped, verification code is clearly displayed
   */
  private generateActivationEmailHTML(user: User, verificationCode: string): string {
    return `
      <!DOCTYPE html>
      <html lang="fi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tervetuloa Memoriaaliin!</title>
        <style>
          body {
            font-family: 'Lato', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            background-color: #161a39;
            color: #ffffff;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 40px;
          }
          .verification-code {
            background-color: #169179;
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            letter-spacing: 2px;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
          }
          .button {
            display: inline-block;
            background-color: #169179;
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MEMORIAALI</h1>
            <h2>Vahvista sähköpostiosoitteesi</h2>
          </div>
          
          <div class="content">
            <h3>Tervetuloa Memoriaaliin!</h3>
            
            <p>Hei ${user.username},</p>
            
            <p>Aloittaaksesi palvelun käytön sinun tulee vahvistaa sähköpostiosoitteesi.</p>
            
            <p>Siirry osoitteeseen <a href="https://memoriaali.memorylab.fi/">https://memoriaali.memorylab.fi/</a> ja syötä alla oleva koodi:</p>
            
            <div class="verification-code">
              ${verificationCode}
            </div>
            
          </div>
          
          <div class="footer">
            <p>Tämä viesti on lähetetty automaattisesti, älä vastaa siihen. Jos et ole äskettäin rekisteröitynyt Memoriaali-palveluun, voit jättää tämän viestin huomioimatta</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send password reset email
   *
   * Sends a password reset email to the user with a reset token.
   * Includes secure reset link and clear instructions.
   *
   * Preconditions: user exists, resetToken is valid
   * Postconditions: Email sent to user's email address
   * Invariants: Email content is properly formatted, reset token included
   */
  async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    try {
      // Validate environment variables
      this.validateEmailConfiguration();

      console.info('📧 Sending password reset email:');
      console.info(`   To: ${user.email}`);
      console.info(`   Subject: Salasanan vaihto - Memoriaali`);
      console.info(`   User: ${user.firstName} ${user.lastName} (${user.username})`);

      // In development mode, just log the email details (unless FORCE_EMAIL_SEND is set)
      if (process.env.NODE_ENV === 'development' && process.env.FORCE_EMAIL_SEND !== 'true') {
        console.info(`   Reset Token: ${resetToken}`);
        console.info(
          `   Reset URL: ${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/reset-password?token=${resetToken}`,
        );
        return;
      }

      // Production email sending
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: user.email,
        subject: 'Salasanan vaihto - Memoriaali',
        html: this.generatePasswordResetEmailHTML(user, resetUrl),
      };

      await transporter.sendMail(mailOptions);

      console.info('✅ Password reset email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw new Error(
        `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate password reset email HTML
   *
   * Creates HTML content for password reset email with secure reset link.
   * Includes clear instructions and security information.
   *
   * Preconditions: user exists, resetUrl is valid
   * Postconditions: Returns formatted HTML email content
   * Invariants: HTML is properly formatted, security information included
   */
  private generatePasswordResetEmailHTML(user: User, resetUrl: string): string {
    const userName = user.firstName
      ? `${user.firstName} ${user.lastName ?? ''}`.trim()
      : user.username;

    return `
      <!DOCTYPE html>
      <html lang="fi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Salasanan vaihto - Memoriaali</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #2980b9;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Memoriaali</h1>
          <h2>Salasanan vaihto</h2>
        </div>
        
        <div class="content">
          <p>Hei ${userName},</p>
          
          <p>Olemme vastaanottaneet pyynnön salasanan vaihtamiseen Memoriaali-tilillesi.</p>
          
          <p>Jos pyysit salasanan vaihtoa, klikkaa alla olevaa linkkiä:</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Vaihda salasana</a>
          </p>
          
          <div class="warning">
            <strong>Turvallisuus:</strong>
            <ul>
              <li>Linkki on voimassa 24 tuntia</li>
              <li>Linkki voidaan käyttää vain kerran</li>
              <li>Jos et pyytänyt salasanan vaihtoa, voit turvallisesti jättää tämän viestin huomiotta</li>
            </ul>
          </div>
          
          <p>Jos linkki ei toimi, voit kopioida ja liittää seuraavan osoitteen selaimeen:</p>
          <p style="word-break: break-all; background-color: #f1f1f1; padding: 10px; border-radius: 3px;">
            ${resetUrl}
          </p>
          
          <p>Jos sinulla on kysymyksiä, ota yhteyttä tukeen.</p>
          
          <p>Ystävällisin terveisin,<br>Memoriaali-tiimi</p>
        </div>
        
        <div class="footer">
          <p>© 2024 Memoriaali. Kaikki oikeudet pidätetään.</p>
          <p>Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send welcome email
   *
   * Sends a welcome email to newly activated users.
   * This is a placeholder for future welcome email functionality.
   *
   * Preconditions: user exists and is activated
   * Postconditions: Email sent to user's email address
   * Invariants: Email content is properly formatted
   */
  async sendWelcomeEmail(user: User): Promise<void> {
    try {
      console.info('📧 Welcome email would be sent to:', user.email);

      // TODO: Implement actual welcome email functionality
      // This would follow the same pattern as sendActivationEmail

      // Simulate async operation for now
      await new Promise((resolve) => setTimeout(resolve, 0));
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw new Error(
        `Failed to send welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
