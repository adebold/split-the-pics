import { jest } from '@jest/globals';
import crypto from 'crypto';
import { qrAuthService } from '../../../src/server/services/qrAuthService.js';
import { prisma } from '../../../src/server/database/prisma.js';

// Mock crypto.randomBytes
jest.mock('crypto');

describe('QRAuthService', () => {
  beforeEach(() => {
    // Mock crypto.randomBytes to return predictable values
    crypto.randomBytes.mockImplementation((size) => {
      if (size === 16) return Buffer.from('1234567890abcdef');
      if (size === 32) return Buffer.from('1234567890abcdef1234567890abcdef');
      return Buffer.alloc(size);
    });
  });

  describe('createSession', () => {
    it('should create new QR session', async () => {
      const deviceInfo = {
        userAgent: 'Mobile App v1.0',
        platform: 'iOS',
      };
      const mockSession = {
        id: 'session-123',
        sessionId: '31323334353637383930616263646566',
        token: '3132333435363738393061626364656631323334353637383930616263646566',
        deviceInfo,
        status: 'PENDING',
        expiresAt: expect.any(Date),
      };

      prisma.qRSession.create.mockResolvedValue(mockSession);

      const result = await qrAuthService.createSession(deviceInfo);

      expect(prisma.qRSession.create).toHaveBeenCalledWith({
        data: {
          sessionId: '31323334353637383930616263646566',
          token: '3132333435363738393061626364656631323334353637383930616263646566',
          deviceInfo,
          expiresAt: expect.any(Date),
          status: 'PENDING',
        },
      });
      expect(result).toEqual({
        id: '31323334353637383930616263646566',
        token: '3132333435363738393061626364656631323334353637383930616263646566',
        expiresAt: expect.any(Date),
      });
    });

    it('should set 5 minute expiration', async () => {
      const deviceInfo = {};
      let capturedData;
      
      prisma.qRSession.create.mockImplementation(({ data }) => {
        capturedData = data;
        return Promise.resolve({ ...data, id: 'session-123' });
      });

      const before = Date.now();
      await qrAuthService.createSession(deviceInfo);
      const after = Date.now();

      const expiresAt = capturedData.expiresAt.getTime();
      expect(expiresAt).toBeGreaterThan(before + 4 * 60 * 1000); // > 4 minutes
      expect(expiresAt).toBeLessThan(after + 6 * 60 * 1000); // < 6 minutes
    });
  });

  describe('getSessionStatus', () => {
    it('should return authenticated status', async () => {
      const sessionId = 'valid-session-id';
      const mockSession = {
        id: 'session-123',
        sessionId,
        status: 'AUTHENTICATED',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 60000),
      };

      prisma.qRSession.findUnique.mockResolvedValue(mockSession);

      const result = await qrAuthService.getSessionStatus(sessionId);

      expect(result).toEqual({
        status: 'AUTHENTICATED',
        authenticated: true,
        userId: 'user-123',
      });
    });

    it('should return pending status', async () => {
      const sessionId = 'pending-session-id';
      const mockSession = {
        id: 'session-123',
        sessionId,
        status: 'PENDING',
        userId: null,
        expiresAt: new Date(Date.now() + 60000),
      };

      prisma.qRSession.findUnique.mockResolvedValue(mockSession);

      const result = await qrAuthService.getSessionStatus(sessionId);

      expect(result).toEqual({
        status: 'PENDING',
        authenticated: false,
        userId: null,
      });
    });

    it('should handle expired session', async () => {
      const sessionId = 'expired-session-id';
      const mockSession = {
        id: 'session-123',
        sessionId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60000), // Expired
      };

      prisma.qRSession.findUnique.mockResolvedValue(mockSession);
      prisma.qRSession.update.mockResolvedValue({});

      const result = await qrAuthService.getSessionStatus(sessionId);

      expect(result).toEqual({ status: 'EXPIRED' });
      expect(prisma.qRSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { status: 'EXPIRED' },
      });
    });

    it('should handle non-existent session', async () => {
      prisma.qRSession.findUnique.mockResolvedValue(null);

      const result = await qrAuthService.getSessionStatus('non-existent');

      expect(result).toEqual({ status: 'NOT_FOUND' });
    });
  });

  describe('authenticateSession', () => {
    it('should authenticate valid session', async () => {
      const token = 'valid-token';
      const userId = 'user-123';
      const mockSession = {
        id: 'session-123',
        sessionId: 'session-id',
        token,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60000),
      };

      prisma.qRSession.findFirst.mockResolvedValue(mockSession);
      prisma.qRSession.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await qrAuthService.authenticateSession(token, userId);

      expect(prisma.qRSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          status: 'AUTHENTICATED',
          userId,
          authenticatedAt: expect.any(Date),
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: 'QR_LOGIN',
          entityType: 'QRSession',
          entityId: 'session-123',
          metadata: { sessionId: 'session-id' },
        },
      });
      expect(result).toEqual({ success: true });
    });

    it('should reject invalid token', async () => {
      prisma.qRSession.findFirst.mockResolvedValue(null);

      await expect(qrAuthService.authenticateSession('invalid-token', 'user-123'))
        .rejects.toThrow('Invalid or expired QR session');
    });

    it('should reject expired session', async () => {
      const token = 'expired-token';
      const mockSession = {
        id: 'session-123',
        token,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60000), // Expired
      };

      prisma.qRSession.findFirst.mockResolvedValue(null);

      await expect(qrAuthService.authenticateSession(token, 'user-123'))
        .rejects.toThrow('Invalid or expired QR session');
    });
  });

  describe('cancelSession', () => {
    it('should cancel pending session', async () => {
      const sessionId = 'session-to-cancel';
      const mockSession = {
        id: 'session-123',
        sessionId,
        status: 'PENDING',
      };

      prisma.qRSession.findUnique.mockResolvedValue(mockSession);
      prisma.qRSession.update.mockResolvedValue({});

      const result = await qrAuthService.cancelSession(sessionId);

      expect(result).toBe(true);
      expect(prisma.qRSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should not cancel non-pending session', async () => {
      const sessionId = 'authenticated-session';
      const mockSession = {
        id: 'session-123',
        sessionId,
        status: 'AUTHENTICATED',
      };

      prisma.qRSession.findUnique.mockResolvedValue(mockSession);

      const result = await qrAuthService.cancelSession(sessionId);

      expect(result).toBe(false);
      expect(prisma.qRSession.update).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      prisma.qRSession.deleteMany.mockResolvedValue({ count: 5 });

      const result = await qrAuthService.cleanupExpiredSessions();

      expect(result).toBe(5);
      expect(prisma.qRSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
          status: { in: ['PENDING', 'EXPIRED'] },
        },
      });
    });

    it('should handle no expired sessions', async () => {
      prisma.qRSession.deleteMany.mockResolvedValue({ count: 0 });

      const result = await qrAuthService.cleanupExpiredSessions();

      expect(result).toBe(0);
    });
  });

  describe('validateQRData', () => {
    it('should validate correct QR data format', () => {
      const validData = {
        sessionId: '1234567890abcdef1234567890abcdef',
        token: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      };

      const result = qrAuthService.validateQRData(validData);

      expect(result).toBe(true);
    });

    it('should reject missing sessionId', () => {
      const invalidData = {
        token: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      };

      const result = qrAuthService.validateQRData(invalidData);

      expect(result).toBe(false);
    });

    it('should reject missing token', () => {
      const invalidData = {
        sessionId: '1234567890abcdef1234567890abcdef',
      };

      const result = qrAuthService.validateQRData(invalidData);

      expect(result).toBe(false);
    });

    it('should reject invalid sessionId format', () => {
      const invalidData = {
        sessionId: 'invalid-format',
        token: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      };

      const result = qrAuthService.validateQRData(invalidData);

      expect(result).toBe(false);
    });

    it('should reject invalid token format', () => {
      const invalidData = {
        sessionId: '1234567890abcdef1234567890abcdef',
        token: 'invalid-token-format',
      };

      const result = qrAuthService.validateQRData(invalidData);

      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', () => {
      const result = qrAuthService.validateQRData(null);

      expect(result).toBe(false);
    });
  });
});