import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger.js';

export function initializeSentry(app) {
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Enable profiling
      new ProfilingIntegration(),
      // Prisma integration
      new Sentry.Integrations.Prisma({ client: true }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.SENTRY_RELEASE || 'unknown',
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out specific errors
      const error = hint.originalException;
      
      // Don't send 404 errors
      if (error?.status === 404) {
        return null;
      }
      
      // Don't send validation errors
      if (error?.name === 'ValidationError') {
        return null;
      }
      
      // Filter out sensitive data
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        
        // Remove sensitive body fields
        if (event.request.data) {
          const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
          sensitiveFields.forEach(field => {
            if (event.request.data[field]) {
              event.request.data[field] = '[REDACTED]';
            }
          });
        }
      }
      
      // Add user context if available
      if (event.user) {
        event.user = {
          id: event.user.id,
          email: event.user.email?.replace(/^(.{3}).*@/, '$1***@'),
        };
      }
      
      return event;
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      
      // Sanitize database queries
      if (breadcrumb.category === 'db.query') {
        if (breadcrumb.data?.query) {
          // Remove potentially sensitive values from SQL
          breadcrumb.data.query = breadcrumb.data.query
            .replace(/\b\d{4,}\b/g, '[NUMBER]')
            .replace(/'.+?'/g, "'[VALUE]'");
        }
      }
      
      return breadcrumb;
    },
    
    // Attach additional context
    initialScope: {
      tags: {
        component: 'backend',
        runtime: 'node',
      },
    },
  });

  logger.info('Sentry error tracking initialized');
}

// Helper function to capture custom events
export function captureEvent(message, level = 'info', extra = {}) {
  Sentry.captureMessage(message, level, {
    extra,
    tags: {
      custom: true,
    },
  });
}

// Helper function to add user context
export function setUserContext(user) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

// Helper function to add custom context
export function addBreadcrumb(message, category = 'custom', level = 'info', data = {}) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

// Helper function to create transaction
export function startTransaction(name, op = 'http.server') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

// Helper function to measure performance
export function measurePerformance(name, operation) {
  const transaction = Sentry.getCurrentHub().getScope().getTransaction();
  const span = transaction?.startChild({
    op: 'function',
    description: name,
  });

  try {
    const result = operation();
    if (result instanceof Promise) {
      return result.finally(() => span?.finish());
    }
    span?.finish();
    return result;
  } catch (error) {
    span?.setStatus('internal_error');
    span?.finish();
    throw error;
  }
}

// Error handler middleware for Express
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all 5xx errors
      if (error.status >= 500) {
        return true;
      }
      
      // Capture specific 4xx errors
      if ([401, 403, 429].includes(error.status)) {
        return true;
      }
      
      // Capture unhandled errors
      if (!error.status) {
        return true;
      }
      
      return false;
    },
  });
}