import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

// Create transporter based on environment
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // For development, use ethereal email or console logging
    return {
      sendMail: async (mailOptions) => {
        logger.info('📧 Email would be sent:', mailOptions);
        return { messageId: 'dev-message-id' };
      },
    };
  }
};

const transporter = createTransporter();

export const emailService = {
  async sendWelcomeEmail(email, name) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@securesnap.com',
        to: email,
        subject: 'Welcome to SecureSnap!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to SecureSnap, ${name}!</h1>
            <p>Thank you for joining SecureSnap, the secure way to share your precious memories.</p>
            
            <h2>Getting Started:</h2>
            <ul>
              <li>Upload your first photos securely</li>
              <li>Enable two-factor authentication for extra security</li>
              <li>Create albums to organize your memories</li>
              <li>Share photos with time-limited links</li>
            </ul>
            
            <p>Your privacy and security are our top priorities. All your photos are encrypted end-to-end.</p>
            
            <p style="margin-top: 30px;">
              <a href="${process.env.CLIENT_URL}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                Go to SecureSnap
              </a>
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`, { messageId: info.messageId });
      
      return info;
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      throw error;
    }
  },

  async sendMagicLink(email, name, magicLink) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@securesnap.com',
        to: email,
        subject: 'Your SecureSnap Login Link',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Hi ${name},</h1>
            <p>You requested a magic link to log in to SecureSnap.</p>
            
            <p>Click the button below to log in. This link will expire in 15 minutes.</p>
            
            <p style="margin: 30px 0;">
              <a href="${magicLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                Log in to SecureSnap
              </a>
            </p>
            
            <p style="color: #666;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; word-break: break-all;">${magicLink}</p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              If you didn't request this login link, please ignore this email.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Magic link sent to ${email}`, { messageId: info.messageId });
      
      return info;
    } catch (error) {
      logger.error('Error sending magic link:', error);
      throw error;
    }
  },

  async send2FABackupCodes(email, name, backupCodes) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@securesnap.com',
        to: email,
        subject: 'Your SecureSnap 2FA Backup Codes',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Hi ${name},</h1>
            <p>You've enabled two-factor authentication on your SecureSnap account. Great choice!</p>
            
            <p>Here are your backup codes. Keep them safe - each code can only be used once:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; font-family: monospace;">
              ${backupCodes.map(code => `<div style="margin: 5px 0;">${code}</div>`).join('')}
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>Store these codes in a safe place</li>
              <li>Each code can only be used once</li>
              <li>Use them if you lose access to your authenticator app</li>
              <li>Generate new codes after using any of these</li>
            </ul>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This email was sent because 2FA was enabled on your account.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`2FA backup codes sent to ${email}`, { messageId: info.messageId });
      
      return info;
    } catch (error) {
      logger.error('Error sending 2FA backup codes:', error);
      throw error;
    }
  },

  async sendShareNotification(email, name, sharedByName, photoCount, shareLink) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@securesnap.com',
        to: email,
        subject: `${sharedByName} shared photos with you on SecureSnap`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Hi ${name},</h1>
            <p>${sharedByName} has shared ${photoCount} photo${photoCount > 1 ? 's' : ''} with you on SecureSnap.</p>
            
            <p style="margin: 30px 0;">
              <a href="${shareLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                View Photos
              </a>
            </p>
            
            <p style="color: #666;">This link will expire soon, so make sure to view the photos before it does.</p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              You're receiving this because someone shared photos with you on SecureSnap.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Share notification sent to ${email}`, { messageId: info.messageId });
      
      return info;
    } catch (error) {
      logger.error('Error sending share notification:', error);
      throw error;
    }
  },

  async sendSecurityAlert(email, name, alertType, details) {
    try {
      const alertMessages = {
        NEW_DEVICE: 'A new device was added to your account',
        LOGIN_FROM_NEW_LOCATION: 'Login detected from a new location',
        PASSWORD_CHANGED: 'Your password was changed',
        TWO_FACTOR_ENABLED: 'Two-factor authentication was enabled',
        TWO_FACTOR_DISABLED: 'Two-factor authentication was disabled',
      };

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@securesnap.com',
        to: email,
        subject: 'Security Alert - SecureSnap',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #d32f2f;">Security Alert</h1>
            <p>Hi ${name},</p>
            
            <p><strong>${alertMessages[alertType] || 'Security event detected'}</strong></p>
            
            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
              <p><strong>Details:</strong></p>
              <p>Time: ${new Date().toLocaleString()}</p>
              ${details.ipAddress ? `<p>IP Address: ${details.ipAddress}</p>` : ''}
              ${details.location ? `<p>Location: ${details.location}</p>` : ''}
              ${details.device ? `<p>Device: ${details.device}</p>` : ''}
            </div>
            
            <p>If this was you, no action is needed. If you don't recognize this activity, please:</p>
            <ol>
              <li>Change your password immediately</li>
              <li>Review your account settings</li>
              <li>Enable two-factor authentication if you haven't already</li>
            </ol>
            
            <p style="margin-top: 30px;">
              <a href="${process.env.CLIENT_URL}/settings/security" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                Review Security Settings
              </a>
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Security alert sent to ${email}`, { alertType, messageId: info.messageId });
      
      return info;
    } catch (error) {
      logger.error('Error sending security alert:', error);
      throw error;
    }
  },
};