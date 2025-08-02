import { jest } from '@jest/globals';
import { userService } from '../../../src/server/services/userService.js';
import { prisma } from '../../../src/server/database/prisma.js';
import { faker } from '@faker-js/faker';

describe('UserService', () => {
  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = createMockUser();
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.findById(mockUser.id);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        include: { settings: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email (case insensitive)', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.findByEmail('TEST@EXAMPLE.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { settings: true },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create new user with settings', async () => {
      const userData = {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        password: 'hashed_password',
      };
      const mockUser = createMockUser(userData);
      
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await userService.create(userData);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          ...userData,
          email: userData.email.toLowerCase(),
          settings: { create: {} },
        },
        include: { settings: true },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: mockUser.id,
        },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('recordFailedLogin', () => {
    it('should increment failed attempts', async () => {
      const mockUser = createMockUser({ failedAttempts: 2 });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, failedAttempts: 3 });
      prisma.auditLog.create.mockResolvedValue({});

      await userService.recordFailedLogin(mockUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { failedAttempts: 3 },
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      const mockUser = createMockUser({ failedAttempts: 4 });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await userService.recordFailedLogin(mockUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedAttempts: 5,
          lockedUntil: expect.any(Date),
        },
      });
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should reset failed attempts and clear lock', async () => {
      const mockUser = createMockUser({ failedAttempts: 3, lockedUntil: new Date() });
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await userService.recordSuccessfulLogin(mockUser.id, '192.168.1.1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          action: 'LOGIN_SUCCESS',
          entityType: 'User',
          entityId: mockUser.id,
          ipAddress: '192.168.1.1',
        },
      });
    });
  });

  describe('saveRefreshToken', () => {
    it('should save refresh token with expiration', async () => {
      const userId = 'user-123';
      const token = 'refresh-token';
      
      prisma.refreshToken.create.mockResolvedValue({
        id: 'token-123',
        userId,
        token,
        expiresAt: expect.any(Date),
      });

      const result = await userService.saveRefreshToken(userId, token);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId,
          token,
          expiresAt: expect.any(Date),
        },
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const userId = 'user-123';
      const token = 'valid-refresh-token';
      
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-123',
        userId,
        token,
        expiresAt: new Date(Date.now() + 86400000), // 1 day in future
      });

      const result = await userService.verifyRefreshToken(userId, token);

      expect(result).toBe(true);
      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          token,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });

    it('should reject expired refresh token', async () => {
      const userId = 'user-123';
      const token = 'expired-token';
      
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      const result = await userService.verifyRefreshToken(userId, token);

      expect(result).toBe(false);
    });
  });

  describe('saveTrustedDevice', () => {
    it('should save trusted device with 30 day expiration', async () => {
      const userId = 'user-123';
      const deviceToken = 'device-token';
      const deviceName = 'Chrome on Windows';
      
      prisma.trustedDevice.create.mockResolvedValue({
        id: 'device-123',
        userId,
        deviceToken,
        deviceName,
        expiresAt: expect.any(Date),
      });

      const result = await userService.saveTrustedDevice(userId, deviceToken, deviceName);

      expect(prisma.trustedDevice.create).toHaveBeenCalledWith({
        data: {
          userId,
          deviceToken,
          deviceName,
          expiresAt: expect.any(Date),
        },
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('verifyTrustedDevice', () => {
    it('should verify valid trusted device and update last used', async () => {
      const userId = 'user-123';
      const deviceToken = 'valid-device-token';
      const device = {
        id: 'device-123',
        userId,
        deviceToken,
        expiresAt: new Date(Date.now() + 86400000), // 1 day in future
      };
      
      prisma.trustedDevice.findFirst.mockResolvedValue(device);
      prisma.trustedDevice.update.mockResolvedValue({});

      const result = await userService.verifyTrustedDevice(userId, deviceToken);

      expect(result).toBe(true);
      expect(prisma.trustedDevice.update).toHaveBeenCalledWith({
        where: { id: device.id },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });

  describe('verifyMagicLinkToken', () => {
    it('should verify and consume valid magic link', async () => {
      const token = 'valid-magic-link';
      const mockUser = createMockUser();
      const magicLink = {
        id: 'link-123',
        userId: mockUser.id,
        token,
        expiresAt: new Date(Date.now() + 900000), // 15 min in future
        usedAt: null,
        user: mockUser,
      };
      
      prisma.magicLink.findFirst.mockResolvedValue(magicLink);
      prisma.magicLink.update.mockResolvedValue({});

      const result = await userService.verifyMagicLinkToken(token);

      expect(result).toEqual(mockUser);
      expect(prisma.magicLink.update).toHaveBeenCalledWith({
        where: { id: magicLink.id },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should reject already used magic link', async () => {
      const token = 'used-magic-link';
      
      prisma.magicLink.findFirst.mockResolvedValue(null);

      const result = await userService.verifyMagicLinkToken(token);

      expect(result).toBeNull();
    });
  });

  describe('updateStorageUsage', () => {
    it('should update storage usage', async () => {
      const userId = 'user-123';
      const settings = {
        userId,
        usedStorageBytes: 1000000n, // 1MB
        storageQuotaBytes: 5368709120n, // 5GB
      };
      
      prisma.userSettings.findUnique.mockResolvedValue(settings);
      prisma.userSettings.update.mockResolvedValue({});

      await userService.updateStorageUsage(userId, 500000); // Add 500KB

      expect(prisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId },
        data: { usedStorageBytes: 1500000n },
      });
    });

    it('should reject when storage quota exceeded', async () => {
      const userId = 'user-123';
      const settings = {
        userId,
        usedStorageBytes: 5368709120n, // Already at 5GB limit
        storageQuotaBytes: 5368709120n, // 5GB
      };
      
      prisma.userSettings.findUnique.mockResolvedValue(settings);

      await expect(userService.updateStorageUsage(userId, 1000000))
        .rejects.toThrow('Storage quota exceeded');
    });

    it('should send notification when usage above 80%', async () => {
      const userId = 'user-123';
      const settings = {
        userId,
        usedStorageBytes: 4000000000n, // 4GB
        storageQuotaBytes: 5368709120n, // 5GB
      };
      
      prisma.userSettings.findUnique.mockResolvedValue(settings);
      prisma.userSettings.update.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      await userService.updateStorageUsage(userId, 500000000); // Add 500MB

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: 'STORAGE_WARNING',
          title: 'Storage Space Running Low',
          message: expect.stringContaining('used'),
          data: { usagePercent: expect.any(Number) },
        },
      });
    });
  });
});