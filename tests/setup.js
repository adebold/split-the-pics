import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_characters_long';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_32_chars';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_characters_';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock Prisma client
jest.mock('../src/server/database/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    photo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    album: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(this.prisma)),
    $disconnect: jest.fn(),
  },
}));

// Mock logger to reduce noise in tests
jest.mock('../src/server/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  httpLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
  morganStream: {
    write: jest.fn(),
  },
}));

// Global test utilities
global.createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: '$2b$12$mock.hashed.password',
  twoFactorEnabled: false,
  twoFactorSecret: null,
  backupCodes: [],
  lockedUntil: null,
  failedAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

global.createMockPhoto = (overrides = {}) => ({
  id: 'photo-123',
  userId: 'user-123',
  originalUrl: 'https://example.com/photo.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024000n,
  width: 1920,
  height: 1080,
  encryptionKey: 'encrypted-key',
  encryptionIv: 'encryption-iv',
  hash: 'photo-hash',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});