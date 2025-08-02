import crypto from 'crypto';
import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';

export const qrAuthService = {
  // Create new QR authentication session
  async createSession(deviceInfo) {
    try {
      const sessionId = crypto.randomBytes(16).toString('hex');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const qrSession = await prisma.qRSession.create({
        data: {
          sessionId,
          token,
          deviceInfo,
          expiresAt,
          status: 'PENDING',
        },
      });

      logger.info('QR session created', { sessionId });

      return {
        id: sessionId,
        token,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error creating QR session:', error);
      throw error;
    }
  },

  // Get session status
  async getSessionStatus(sessionId) {
    try {
      const session = await prisma.qRSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        return { status: 'NOT_FOUND' };
      }

      if (session.expiresAt < new Date()) {
        // Update expired sessions
        if (session.status === 'PENDING') {
          await prisma.qRSession.update({
            where: { id: session.id },
            data: { status: 'EXPIRED' },
          });
        }
        return { status: 'EXPIRED' };
      }

      return {
        status: session.status,
        authenticated: session.status === 'AUTHENTICATED',
        userId: session.userId,
      };
    } catch (error) {
      logger.error('Error getting QR session status:', error);
      throw error;
    }
  },

  // Authenticate QR session (called from mobile app)
  async authenticateSession(token, userId) {
    try {
      const session = await prisma.qRSession.findFirst({
        where: {
          token,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        throw new Error('Invalid or expired QR session');
      }

      // Update session
      await prisma.qRSession.update({
        where: { id: session.id },
        data: {
          status: 'AUTHENTICATED',
          userId,
          authenticatedAt: new Date(),
        },
      });

      // Log authentication
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'QR_LOGIN',
          entityType: 'QRSession',
          entityId: session.id,
          metadata: { sessionId: session.sessionId },
        },
      });

      logger.info('QR session authenticated', { sessionId: session.sessionId, userId });

      return { success: true };
    } catch (error) {
      logger.error('Error authenticating QR session:', error);
      throw error;
    }
  },

  // Cancel QR session
  async cancelSession(sessionId) {
    try {
      const session = await prisma.qRSession.findUnique({
        where: { sessionId },
      });

      if (!session || session.status !== 'PENDING') {
        return false;
      }

      await prisma.qRSession.update({
        where: { id: session.id },
        data: { status: 'CANCELLED' },
      });

      logger.info('QR session cancelled', { sessionId });

      return true;
    } catch (error) {
      logger.error('Error cancelling QR session:', error);
      throw error;
    }
  },

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      const result = await prisma.qRSession.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          status: { in: ['PENDING', 'EXPIRED'] },
        },
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired QR sessions`);
      }

      return result.count;
    } catch (error) {
      logger.error('Error cleaning up QR sessions:', error);
      throw error;
    }
  },

  // Validate QR code data
  validateQRData(data) {
    try {
      // Ensure required fields
      if (!data.sessionId || !data.token) {
        return false;
      }

      // Validate format
      if (!/^[a-f0-9]{32}$/.test(data.sessionId)) {
        return false;
      }

      if (!/^[a-f0-9]{64}$/.test(data.token)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },
};