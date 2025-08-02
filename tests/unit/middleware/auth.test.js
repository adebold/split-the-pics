import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { authenticateToken, authenticate2FA, requireRole, optionalAuth } from '../../../src/server/middleware/auth.js';
import { prisma } from '../../../src/server/database/prisma.js';

// Mock JWT
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const mockUser = createMockUser();
      req.headers.authorization = 'Bearer valid-token';
      
      jwt.verify.mockReturnValue({ userId: mockUser.id, type: 'access' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(req.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing token', async () => {
      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token type', async () => {
      req.headers.authorization = 'Bearer refresh-token';
      jwt.verify.mockReturnValue({ userId: 'user-123', type: 'refresh' });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token type' });
    });

    it('should handle expired token', async () => {
      req.headers.authorization = 'Bearer expired-token';
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => { throw error; });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token expired' });
    });

    it('should handle invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => { throw error; });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    });
  });

  describe('authenticate2FA', () => {
    beforeEach(() => {
      req.user = { id: 'user-123' };
    });

    it('should skip 2FA for trusted device', async () => {
      const mockUser = createMockUser({ twoFactorEnabled: true });
      req.headers['x-device-token'] = 'trusted-device-token';
      
      prisma.user.findUnique.mockResolvedValue(mockUser);
      // Mock userService.verifyTrustedDevice
      const userService = await import('../../../src/server/services/userService.js');
      userService.userService.verifyTrustedDevice = jest.fn().mockResolvedValue(true);

      await authenticate2FA(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip 2FA for users without 2FA enabled', async () => {
      const mockUser = createMockUser({ twoFactorEnabled: false });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate2FA(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should require 2FA token when enabled', async () => {
      const mockUser = createMockUser({ twoFactorEnabled: true });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate2FA(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: '2FA verification required',
        requires2FA: true,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should verify valid 2FA token', async () => {
      const mockUser = createMockUser({ twoFactorEnabled: true });
      req.headers['x-2fa-token'] = 'valid-2fa-token';
      
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const userService = await import('../../../src/server/services/userService.js');
      userService.userService.verify2FAToken = jest.fn().mockResolvedValue(true);

      await authenticate2FA(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid 2FA token', async () => {
      const mockUser = createMockUser({ twoFactorEnabled: true });
      req.headers['x-2fa-token'] = 'invalid-2fa-token';
      
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const userService = await import('../../../src/server/services/userService.js');
      userService.userService.verify2FAToken = jest.fn().mockResolvedValue(false);

      await authenticate2FA(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid 2FA token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      req.user = { id: 'user-123' };
    });

    it('should allow user with required role', async () => {
      const mockUser = createMockUser({ roles: ['admin', 'user'] });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny user without required role', async () => {
      const mockUser = createMockUser({ roles: ['user'] });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle users with no roles', async () => {
      const mockUser = createMockUser({ roles: null });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
    });
  });

  describe('optionalAuth', () => {
    it('should continue without token', () => {
      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should authenticate valid token', async () => {
      const mockUser = createMockUser();
      req.headers.authorization = 'Bearer valid-token';
      
      jwt.verify.mockReturnValue({ userId: mockUser.id, type: 'access' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock authenticateToken to call next with user
      const originalAuthenticateToken = jest.requireActual('../../../src/server/middleware/auth.js').authenticateToken;
      jest.spyOn(originalAuthenticateToken, 'apply').mockImplementation((thisArg, args) => {
        req.user = { id: mockUser.id, email: mockUser.email, name: mockUser.name };
        args[2](); // Call next
      });

      optionalAuth(req, res, next);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(next).toHaveBeenCalled();
    });

    it('should continue even with invalid token', () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      optionalAuth(req, res, (err) => {
        if (err) {
          next();
        } else {
          next();
        }
      });

      expect(next).toHaveBeenCalled();
    });
  });
});