import { prisma } from '../database/prisma.js';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export const userService = {
  // Find user by ID
  async findById(id) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: { settings: true },
      });
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  },

  // Find user by email
  async findByEmail(email) {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { settings: true },
      });
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  },

  // Create new user
  async create(userData) {
    try {
      const user = await prisma.user.create({
        data: {
          ...userData,
          email: userData.email.toLowerCase(),
          settings: {
            create: {},
          },
        },
        include: { settings: true },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: user.id,
        },
      });

      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  async update(id, userData) {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: userData,
        include: { settings: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: id,
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: id,
          metadata: { updatedFields: Object.keys(userData) },
        },
      });

      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  },

  // Record failed login attempt
  async recordFailedLogin(userId) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const failedAttempts = user.failedAttempts + 1;
      
      const updateData = { failedAttempts };
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGIN_FAILED',
          entityType: 'User',
          entityId: userId,
          metadata: { failedAttempts },
        },
      });
    } catch (error) {
      logger.error('Error recording failed login:', error);
      throw error;
    }
  },

  // Record successful login
  async recordSuccessfulLogin(userId, ipAddress) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGIN_SUCCESS',
          entityType: 'User',
          entityId: userId,
          ipAddress,
        },
      });
    } catch (error) {
      logger.error('Error recording successful login:', error);
      throw error;
    }
  },

  // Refresh token management
  async saveRefreshToken(userId, token) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      return await prisma.refreshToken.create({
        data: {
          userId,
          token,
          expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error saving refresh token:', error);
      throw error;
    }
  },

  async verifyRefreshToken(userId, token) {
    try {
      const refreshToken = await prisma.refreshToken.findFirst({
        where: {
          userId,
          token,
          expiresAt: { gt: new Date() },
        },
      });

      return !!refreshToken;
    } catch (error) {
      logger.error('Error verifying refresh token:', error);
      throw error;
    }
  },

  async revokeRefreshToken(userId, token) {
    try {
      await prisma.refreshToken.deleteMany({
        where: { userId, token },
      });
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      throw error;
    }
  },

  // Session token management (for 2FA)
  async saveSessionToken(userId, token) {
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      return await prisma.session.create({
        data: {
          userId,
          token,
          expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error saving session token:', error);
      throw error;
    }
  },

  async verifySessionToken(token) {
    try {
      const session = await prisma.session.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
        },
      });

      return session?.userId;
    } catch (error) {
      logger.error('Error verifying session token:', error);
      throw error;
    }
  },

  async clearSessionToken(token) {
    try {
      await prisma.session.deleteMany({
        where: { token },
      });
    } catch (error) {
      logger.error('Error clearing session token:', error);
      throw error;
    }
  },

  // Trusted device management
  async saveTrustedDevice(userId, deviceToken, deviceName) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      return await prisma.trustedDevice.create({
        data: {
          userId,
          deviceToken,
          deviceName,
          expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error saving trusted device:', error);
      throw error;
    }
  },

  async verifyTrustedDevice(userId, deviceToken) {
    try {
      const device = await prisma.trustedDevice.findFirst({
        where: {
          userId,
          deviceToken,
          expiresAt: { gt: new Date() },
        },
      });

      if (device) {
        // Update last used timestamp
        await prisma.trustedDevice.update({
          where: { id: device.id },
          data: { lastUsedAt: new Date() },
        });
      }

      return !!device;
    } catch (error) {
      logger.error('Error verifying trusted device:', error);
      throw error;
    }
  },

  // Magic link management
  async saveMagicLinkToken(userId, token, expiresAt) {
    try {
      return await prisma.magicLink.create({
        data: {
          userId,
          token,
          expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error saving magic link token:', error);
      throw error;
    }
  },

  async verifyMagicLinkToken(token) {
    try {
      const magicLink = await prisma.magicLink.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
        include: { user: true },
      });

      if (magicLink) {
        // Mark as used
        await prisma.magicLink.update({
          where: { id: magicLink.id },
          data: { usedAt: new Date() },
        });

        return magicLink.user;
      }

      return null;
    } catch (error) {
      logger.error('Error verifying magic link token:', error);
      throw error;
    }
  },

  async clearMagicLinkToken(token) {
    try {
      await prisma.magicLink.deleteMany({
        where: { token },
      });
    } catch (error) {
      logger.error('Error clearing magic link token:', error);
      throw error;
    }
  },

  // 2FA token verification
  async verify2FAToken(userId, token) {
    try {
      // This should integrate with the twoFactorService
      // For now, returning a placeholder
      return true;
    } catch (error) {
      logger.error('Error verifying 2FA token:', error);
      throw error;
    }
  },

  // Get user settings
  async getSettings(userId) {
    try {
      return await prisma.userSettings.findUnique({
        where: { userId },
      });
    } catch (error) {
      logger.error('Error getting user settings:', error);
      throw error;
    }
  },

  // Update user settings
  async updateSettings(userId, settings) {
    try {
      return await prisma.userSettings.update({
        where: { userId },
        data: settings,
      });
    } catch (error) {
      logger.error('Error updating user settings:', error);
      throw error;
    }
  },

  // Update storage usage
  async updateStorageUsage(userId, bytesToAdd) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      const newUsage = BigInt(settings.usedStorageBytes) + BigInt(bytesToAdd);
      
      if (newUsage > BigInt(settings.storageQuotaBytes)) {
        throw new Error('Storage quota exceeded');
      }

      await prisma.userSettings.update({
        where: { userId },
        data: { usedStorageBytes: newUsage },
      });

      // Send notification if usage is above 80%
      const usagePercent = Number(newUsage * 100n / BigInt(settings.storageQuotaBytes));
      if (usagePercent > 80) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'STORAGE_WARNING',
            title: 'Storage Space Running Low',
            message: `You've used ${usagePercent}% of your storage quota.`,
            data: { usagePercent },
          },
        });
      }
    } catch (error) {
      logger.error('Error updating storage usage:', error);
      throw error;
    }
  },
};