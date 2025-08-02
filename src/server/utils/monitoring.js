import { register, collectDefaultMetrics, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { logger } from './logger.js';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({
  prefix: 'securesnap_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom metrics
export const metrics = {
  // HTTP metrics
  httpRequestsTotal: new Counter({
    name: 'securesnap_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),

  httpRequestDuration: new Histogram({
    name: 'securesnap_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  // Authentication metrics
  authAttemptsTotal: new Counter({
    name: 'securesnap_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['method', 'status'],
  }),

  activeSessionsGauge: new Gauge({
    name: 'securesnap_active_sessions',
    help: 'Number of active user sessions',
  }),

  // Photo metrics
  photosUploadedTotal: new Counter({
    name: 'securesnap_photos_uploaded_total',
    help: 'Total number of photos uploaded',
    labelNames: ['status'],
  }),

  photoUploadSize: new Summary({
    name: 'securesnap_photo_upload_size_bytes',
    help: 'Size of uploaded photos in bytes',
    percentiles: [0.5, 0.9, 0.95, 0.99],
  }),

  photoProcessingDuration: new Histogram({
    name: 'securesnap_photo_processing_duration_seconds',
    help: 'Time taken to process photos',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),

  // Database metrics
  dbConnectionsActive: new Gauge({
    name: 'securesnap_db_connections_active',
    help: 'Number of active database connections',
  }),

  dbQueryDuration: new Histogram({
    name: 'securesnap_db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  }),

  // Cache metrics
  cacheHitsTotal: new Counter({
    name: 'securesnap_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  }),

  cacheMissesTotal: new Counter({
    name: 'securesnap_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  }),

  // Storage metrics
  storageUsedBytes: new Gauge({
    name: 'securesnap_storage_used_bytes',
    help: 'Total storage used in bytes',
    labelNames: ['bucket'],
  }),

  // WebSocket metrics
  wsConnectionsActive: new Gauge({
    name: 'securesnap_websocket_connections_active',
    help: 'Number of active WebSocket connections',
  }),

  wsMessagesTotal: new Counter({
    name: 'securesnap_websocket_messages_total',
    help: 'Total number of WebSocket messages',
    labelNames: ['direction', 'type'],
  }),

  // Business metrics
  shareLinksCreated: new Counter({
    name: 'securesnap_share_links_created_total',
    help: 'Total number of share links created',
  }),

  shareLinksAccessed: new Counter({
    name: 'securesnap_share_links_accessed_total',
    help: 'Total number of share link accesses',
  }),

  // Error metrics
  errorsTotal: new Counter({
    name: 'securesnap_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity'],
  }),

  // Rate limit metrics
  rateLimitHits: new Counter({
    name: 'securesnap_rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint'],
  }),
};

// Middleware to track HTTP metrics
export function httpMetricsMiddleware() {
  return (req, res, next) => {
    const start = Date.now();
    
    // Track response
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path || 'unknown';
      const labels = {
        method: req.method,
        route: route,
        status_code: res.statusCode,
      };
      
      metrics.httpRequestsTotal.inc(labels);
      metrics.httpRequestDuration.observe(labels, duration);
    });
    
    next();
  };
}

// Database query tracking
export function trackDatabaseQuery(operation, table, duration) {
  metrics.dbQueryDuration.observe({ operation, table }, duration / 1000);
}

// Authentication tracking
export function trackAuthAttempt(method, success) {
  metrics.authAttemptsTotal.inc({
    method,
    status: success ? 'success' : 'failure',
  });
}

// Photo upload tracking
export function trackPhotoUpload(size, success) {
  metrics.photosUploadedTotal.inc({
    status: success ? 'success' : 'failure',
  });
  
  if (success && size) {
    metrics.photoUploadSize.observe(size);
  }
}

// Cache tracking
export function trackCacheOperation(cacheType, hit) {
  if (hit) {
    metrics.cacheHitsTotal.inc({ cache_type: cacheType });
  } else {
    metrics.cacheMissesTotal.inc({ cache_type: cacheType });
  }
}

// WebSocket tracking
export function trackWebSocketConnection(increment) {
  if (increment) {
    metrics.wsConnectionsActive.inc();
  } else {
    metrics.wsConnectionsActive.dec();
  }
}

export function trackWebSocketMessage(direction, type) {
  metrics.wsMessagesTotal.inc({ direction, type });
}

// Error tracking
export function trackError(type, severity) {
  metrics.errorsTotal.inc({ type, severity });
}

// Rate limit tracking
export function trackRateLimit(endpoint) {
  metrics.rateLimitHits.inc({ endpoint });
}

// Expose metrics endpoint
export function metricsEndpoint() {
  return async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      logger.error('Error generating metrics:', error);
      res.status(500).end();
    }
  };
}

// Health check with detailed status
export function healthCheck(dependencies) {
  return async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || 'unknown',
      checks: {},
    };

    // Check database
    if (dependencies.database) {
      try {
        await dependencies.database.$queryRaw`SELECT 1`;
        health.checks.database = { status: 'healthy' };
      } catch (error) {
        health.checks.database = { status: 'unhealthy', error: error.message };
        health.status = 'unhealthy';
      }
    }

    // Check Redis
    if (dependencies.redis) {
      try {
        await dependencies.redis.ping();
        health.checks.redis = { status: 'healthy' };
      } catch (error) {
        health.checks.redis = { status: 'unhealthy', error: error.message };
        health.status = 'unhealthy';
      }
    }

    // Check S3
    if (dependencies.s3) {
      try {
        await dependencies.s3.headBucket({ Bucket: process.env.S3_BUCKET_NAME }).promise();
        health.checks.s3 = { status: 'healthy' };
      } catch (error) {
        health.checks.s3 = { status: 'unhealthy', error: error.message };
        health.status = 'unhealthy';
      }
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();
    health.checks.memory = {
      status: memoryUsage.heapUsed / memoryUsage.heapTotal < 0.9 ? 'healthy' : 'warning',
      usage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      },
    };

    // CPU usage
    const cpuUsage = process.cpuUsage();
    health.checks.cpu = {
      status: 'healthy',
      usage: {
        user: Math.round(cpuUsage.user / 1000) + ' ms',
        system: Math.round(cpuUsage.system / 1000) + ' ms',
      },
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  };
}

// Graceful shutdown helper
export async function gracefulShutdown(server, dependencies) {
  logger.info('Starting graceful shutdown...');
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  if (dependencies.database) {
    await dependencies.database.$disconnect();
    logger.info('Database connections closed');
  }

  // Close Redis connections
  if (dependencies.redis) {
    await dependencies.redis.quit();
    logger.info('Redis connections closed');
  }

  // Wait for ongoing requests to complete (max 30 seconds)
  const shutdownTimeout = setTimeout(() => {
    logger.error('Forcefully shutting down');
    process.exit(1);
  }, 30000);

  // Clear metrics
  register.clear();
  
  clearTimeout(shutdownTimeout);
  process.exit(0);
}

// Performance monitoring helper
export class PerformanceMonitor {
  constructor(name, labels = {}) {
    this.name = name;
    this.labels = labels;
    this.start = process.hrtime.bigint();
  }

  end() {
    const duration = Number(process.hrtime.bigint() - this.start) / 1e9;
    return duration;
  }
}

logger.info('Monitoring initialized with Prometheus metrics');