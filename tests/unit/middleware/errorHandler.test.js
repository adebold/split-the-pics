import { jest } from '@jest/globals';
import { errorHandler } from '../../../src/server/middleware/errorHandler.js';
import { logger } from '../../../src/server/utils/logger.js';

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/api/test',
      method: 'GET',
      ip: '192.168.1.1',
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should handle generic error', () => {
    const error = new Error('Something went wrong');
    
    errorHandler(error, req, res, next);

    expect(logger.error).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
      error: 'Something went wrong',
      stack: expect.any(String),
      url: '/api/test',
      method: 'GET',
      ip: '192.168.1.1',
      userId: undefined,
    }));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Something went wrong',
      status: 500,
    }));
  });

  it('should include stack trace in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Dev error');
    error.stack = 'Error: Dev error\n    at test.js:10:15';
    
    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Dev error',
      status: 500,
      stack: error.stack,
    }));
  });

  it('should not include stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Prod error');
    error.stack = 'Error: Prod error\n    at test.js:10:15';
    
    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Prod error',
      status: 500,
    });
    expect(res.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ stack: expect.any(String) })
    );
  });

  it('should handle validation errors', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = {
      email: 'Invalid email format',
      password: 'Password too short',
    };
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Validation error',
      status: 400,
      errors: error.errors,
    }));
  });

  it('should handle unauthorized errors', () => {
    const error = new Error('Unauthorized access');
    error.name = 'UnauthorizedError';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Unauthorized',
      status: 401,
    }));
  });

  it('should handle forbidden errors', () => {
    const error = new Error('Access forbidden');
    error.name = 'ForbiddenError';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Forbidden',
      status: 403,
    }));
  });

  it('should handle not found errors', () => {
    const error = new Error('User not found');
    error.name = 'NotFoundError';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'User not found',
      status: 404,
    }));
  });

  it('should handle Prisma unique constraint violations', () => {
    const error = new Error('Unique constraint failed');
    error.code = 'P2002';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Resource already exists',
      status: 409,
    }));
  });

  it('should handle Prisma record not found', () => {
    const error = new Error('Record not found');
    error.code = 'P2025';
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Resource not found',
      status: 404,
    }));
  });

  it('should use custom status code', () => {
    const error = new Error('Custom error');
    error.status = 418; // I'm a teapot
    
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Custom error',
      status: 418,
    }));
  });

  it('should log user ID when available', () => {
    req.user = { id: 'user-123' };
    const error = new Error('User error');
    
    errorHandler(error, req, res, next);

    expect(logger.error).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
      userId: 'user-123',
    }));
  });

  it('should handle errors without message', () => {
    const error = new Error();
    
    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Internal server error',
    }));
  });
});