import { jest } from '@jest/globals';
import speakeasy from 'speakeasy';
import { twoFactorService } from '../../../src/server/services/twoFactorService.js';
import { prisma } from '../../../src/server/database/prisma.js';

jest.mock('speakeasy');

describe('TwoFactorService', () => {
  describe('generateSecret', () => {
    it('should generate secret for user email', () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/SecureSnap:test@example.com?secret=JBSWY3DPEHPK3PXP',
      };
      
      speakeasy.generateSecret.mockReturnValue(mockSecret);

      const result = twoFactorService.generateSecret('test@example.com');

      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'SecureSnap (test@example.com)',
        length: 32,
      });
      expect(result).toEqual({
        secret: mockSecret.base32,
        qrCode: mockSecret.otpauth_url,
      });
    });
  });

  describe('verifyTOTP', () => {
    it('should verify valid TOTP code', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const token = '123456';
      
      speakeasy.totp.verify.mockReturnValue(true);

      const result = await twoFactorService.verifyTOTP(secret, token);

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret,
        encoding: 'base32',
        token,
        window: 1,
      });
    });

    it('should reject invalid TOTP code', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const token = '000000';
      
      speakeasy.totp.verify.mockReturnValue(false);

      const result = await twoFactorService.verifyTOTP(secret, token);

      expect(result).toBe(false);
    });

    it('should handle verification errors', async () => {
      const secret = 'INVALID_SECRET';
      const token = '123456';
      
      speakeasy.totp.verify.mockImplementation(() => {
        throw new Error('Invalid secret');
      });

      const result = await twoFactorService.verifyTOTP(secret, token);

      expect(result).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes by default', () => {
      const codes = twoFactorService.generateBackupCodes();

      expect(codes).toHaveLength(10);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      });
    });

    it('should generate specified number of backup codes', () => {
      const codes = twoFactorService.generateBackupCodes(5);

      expect(codes).toHaveLength(5);
    });

    it('should generate unique backup codes', () => {
      const codes = twoFactorService.generateBackupCodes(10);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(10);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify and consume valid backup code', async () => {
      const userId = 'user-123';
      const validCode = 'ABCD-1234';
      const mockUser = createMockUser({
        id: userId,
        backupCodes: [validCode, 'EFGH-5678', 'IJKL-9012'],
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await twoFactorService.verifyBackupCode(userId, validCode);

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { backupCodes: ['EFGH-5678', 'IJKL-9012'] },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: '2FA_BACKUP_CODE_USED',
          entityType: 'User',
          entityId: userId,
          metadata: { remainingCodes: 2 },
        },
      });
    });

    it('should reject invalid backup code', async () => {
      const userId = 'user-123';
      const invalidCode = 'XXXX-XXXX';
      const mockUser = createMockUser({
        id: userId,
        backupCodes: ['ABCD-1234', 'EFGH-5678'],
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await twoFactorService.verifyBackupCode(userId, invalidCode);

      expect(result).toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should send notification when low on backup codes', async () => {
      const userId = 'user-123';
      const validCode = 'ABCD-1234';
      const mockUser = createMockUser({
        id: userId,
        backupCodes: [validCode, 'EFGH-5678'], // Only 2 codes
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      await twoFactorService.verifyBackupCode(userId, validCode);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: 'SECURITY_ALERT',
          title: 'Low on Backup Codes',
          message: 'You have only 1 backup codes remaining. Generate new ones soon.',
        },
      });
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA and generate backup codes', async () => {
      const userId = 'user-123';
      const secret = 'JBSWY3DPEHPK3PXP';
      
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await twoFactorService.enable2FA(userId, secret);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          backupCodes: expect.any(Array),
        },
      });
      expect(result.backupCodes).toHaveLength(10);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: '2FA_ENABLED',
          entityType: 'User',
          entityId: userId,
        },
      });
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA and clear related data', async () => {
      const userId = 'user-123';
      
      prisma.user.update.mockResolvedValue({});
      prisma.trustedDevice.deleteMany.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await twoFactorService.disable2FA(userId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: [],
        },
      });
      expect(prisma.trustedDevice.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: '2FA_DISABLED',
          entityType: 'User',
          entityId: userId,
        },
      });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes', async () => {
      const userId = 'user-123';
      
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await twoFactorService.regenerateBackupCodes(userId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { backupCodes: expect.any(Array) },
      });
      expect(result.backupCodes).toHaveLength(10);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: '2FA_BACKUP_CODES_REGENERATED',
          entityType: 'User',
          entityId: userId,
        },
      });
    });
  });

  describe('is2FAEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      const userId = 'user-123';
      
      prisma.user.findUnique.mockResolvedValue({
        twoFactorEnabled: true,
      });

      const result = await twoFactorService.is2FAEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return false when 2FA is disabled', async () => {
      const userId = 'user-123';
      
      prisma.user.findUnique.mockResolvedValue({
        twoFactorEnabled: false,
      });

      const result = await twoFactorService.is2FAEnabled(userId);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      const userId = 'non-existent';
      
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await twoFactorService.is2FAEnabled(userId);

      expect(result).toBe(false);
    });
  });
});