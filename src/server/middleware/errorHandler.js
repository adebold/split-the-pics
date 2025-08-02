import { logger } from '../utils/logger.js';
import * as Sentry from '@sentry/node';

export const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Add error context to Sentry
  Sentry.withScope((scope) => {
    scope.setTag('error.type', err.name || 'UnknownError');
    scope.setLevel('error');
    scope.setContext('request', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    if (req.user) {
      scope.setUser({
        id: req.user.id,
        email: req.user.email,
      });
    }
    
    // Don't send certain errors to Sentry
    const skipSentryErrors = ['ValidationError', 'NotFoundError'];
    if (!skipSentryErrors.includes(err.name) && (!err.status || err.status >= 500)) {
      Sentry.captureException(err);
    }
  });

  // Determine status code
  const status = err.status || err.statusCode || 500;

  // Prepare error response
  const response = {
    message: err.message || 'Internal server error',
    status,
  };

  // Add additional details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.details;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    response.status = 400;
    response.message = 'Validation error';
    response.errors = err.errors;
  } else if (err.name === 'UnauthorizedError') {
    response.status = 401;
    response.message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    response.status = 403;
    response.message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    response.status = 404;
    response.message = err.message || 'Resource not found';
  } else if (err.code === 'P2002') {
    // Prisma unique constraint violation
    response.status = 409;
    response.message = 'Resource already exists';
  } else if (err.code === 'P2025') {
    // Prisma record not found
    response.status = 404;
    response.message = 'Resource not found';
  }

  // Send error response
  res.status(response.status).json(response);
};