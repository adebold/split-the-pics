import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../../src/server/index.js';
import { prisma } from '../../src/server/database/prisma.js';
import { emailService } from '../../src/server/services/emailService.js';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../src/server/services/emailService.js');

describe('Auth Routes Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        name: 'New User',
      };

      bcrypt.hash.mockResolvedValue('hashed_password');
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-123',
        ...userData,
        password: 'hashed_password',
        settings: {},
      });
      prisma.auditLog.create.mockResolvedValue({});
      jwt.sign.mockReturnValue('mock_token');
      emailService.sendWelcomeEmail.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Registration successful',
        user: {
          email: userData.email,
          name: userData.name,
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'StrongPass123!',
        name: 'Existing User',
      };

      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toEqual({
        message: 'Email already registered',
      });
    });

    it('should validate password requirements', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          path: 'password',
        })
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };
      const mockUser = createMockUser({
        email: loginData.email,
        password: 'hashed_password',
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_token');
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('should handle 2FA requirement', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };
      const mockUser = createMockUser({
        email: loginData.email,
        password: 'hashed_password',
        twoFactorEnabled: true,
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_session_token');
      prisma.session.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        requires2FA: true,
        sessionToken: expect.any(String),
      });
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };
      const mockUser = createMockUser({
        email: loginData.email,
        password: 'hashed_password',
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toEqual({
        message: 'Invalid credentials',
      });
    });

    it('should reject locked account', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };
      const mockUser = createMockUser({
        email: loginData.email,
        password: 'hashed_password',
        lockedUntil: new Date(Date.now() + 3600000), // 1 hour from now
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(423);

      expect(response.body).toEqual({
        message: 'Account temporarily locked due to multiple failed attempts',
      });
    });
  });

  describe('POST /api/auth/2fa/verify', () => {
    it('should verify valid 2FA code', async () => {
      const verifyData = {
        sessionToken: 'valid-session-token',
        code: '123456',
        method: 'totp',
        rememberDevice: true,
      };
      const mockUser = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      });

      prisma.session.findFirst.mockResolvedValue({
        userId: mockUser.id,
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      // Mock twoFactorService.verifyTOTP
      jest.spyOn(await import('../../src/server/services/twoFactorService.js'), 'twoFactorService')
        .verifyTOTP.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_token');
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.trustedDevice.create.mockResolvedValue({});
      prisma.session.deleteMany.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send(verifyData)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        deviceToken: expect.any(String),
      });
    });

    it('should reject invalid 2FA code', async () => {
      const verifyData = {
        sessionToken: 'valid-session-token',
        code: '000000',
        method: 'totp',
      };
      const mockUser = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      });

      prisma.session.findFirst.mockResolvedValue({
        userId: mockUser.id,
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(await import('../../src/server/services/twoFactorService.js'), 'twoFactorService')
        .verifyTOTP.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send(verifyData)
        .expect(401);

      expect(response.body).toEqual({
        message: 'Invalid code',
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      const mockUser = createMockUser();

      jwt.verify.mockReturnValue({ userId: mockUser.id });
      prisma.refreshToken.findFirst.mockResolvedValue({
        userId: mockUser.id,
        token: refreshData.refreshToken,
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('new_access_token');

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body).toEqual({
        accessToken: 'new_access_token',
      });
    });

    it('should reject invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token',
      };

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(401);

      expect(response.body).toEqual({
        message: 'Invalid refresh token',
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user data', async () => {
      const mockUser = createMockUser();
      const token = 'valid-access-token';

      jwt.verify.mockReturnValue({ userId: mockUser.id, type: 'access' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          twoFactorEnabled: mockUser.twoFactorEnabled,
        },
      });
    });

    it('should reject unauthorized request', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });
  });
});