import speakeasy from 'speakeasy';
import crypto from 'crypto';
import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';

export const twoFactorService = {
  // Generate new 2FA secret
  generateSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: `${process.env.TWO_FACTOR_APP_NAME || 'SecureSnap'} (${userEmail})`,
      length: 32,
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    };
  },

  // Verify TOTP code
  async verifyTOTP(secret, token) {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: process.env.TWO_FACTOR_WINDOW || 1,
      });

      return verified;
    } catch (error) {
      logger.error('Error verifying TOTP:', error);
      return false;
    }
  },

  // Generate backup codes
  generateBackupCodes(count = 10) {
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    return codes;
  },

  // Verify backup code
  async verifyBackupCode(userId, code) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.backupCodes.includes(code)) {
        return false;
      }

      // Remove used backup code
      const updatedCodes = user.backupCodes.filter(c => c !== code);
      
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: updatedCodes },
      });

      // Log backup code usage
      await prisma.auditLog.create({
        data: {
          userId,
          action: '2FA_BACKUP_CODE_USED',
          entityType: 'User',
          entityId: userId,
          metadata: { remainingCodes: updatedCodes.length },
        },
      });

      // Send notification if low on backup codes
      if (updatedCodes.length <= 2) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'SECURITY_ALERT',
            title: 'Low on Backup Codes',
            message: `You have only ${updatedCodes.length} backup codes remaining. Generate new ones soon.`,
          },
        });
      }

      return true;
    } catch (error) {
      logger.error('Error verifying backup code:', error);
      return false;
    }
  },

  // Enable 2FA for user
  async enable2FA(userId, secret) {
    try {
      const backupCodes = this.generateBackupCodes();

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          backupCodes,
        },
      });

      // Log 2FA enablement
      await prisma.auditLog.create({
        data: {
          userId,
          action: '2FA_ENABLED',
          entityType: 'User',
          entityId: userId,
        },
      });

      return { backupCodes };
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw error;
    }
  },

  // Disable 2FA for user
  async disable2FA(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: [],
        },
      });

      // Clear all trusted devices
      await prisma.trustedDevice.deleteMany({
        where: { userId },
      });

      // Log 2FA disablement
      await prisma.auditLog.create({
        data: {
          userId,
          action: '2FA_DISABLED',
          entityType: 'User',
          entityId: userId,
        },
      });
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      throw error;
    }
  },

  // Generate new backup codes
  async regenerateBackupCodes(userId) {
    try {
      const backupCodes = this.generateBackupCodes();

      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes },
      });

      // Log backup code regeneration
      await prisma.auditLog.create({
        data: {
          userId,
          action: '2FA_BACKUP_CODES_REGENERATED',
          entityType: 'User',
          entityId: userId,
        },
      });

      return { backupCodes };
    } catch (error) {
      logger.error('Error regenerating backup codes:', error);
      throw error;
    }
  },

  // Check if user has 2FA enabled
  async is2FAEnabled(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorEnabled: true },
      });

      return user?.twoFactorEnabled || false;
    } catch (error) {
      logger.error('Error checking 2FA status:', error);
      return false;
    }
  },
};