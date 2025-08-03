import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Sentry from '@sentry/node';

// Import routes
import authRoutes from './routes/auth.js';
import photoRoutes from './routes/photos.js';
import shareRoutes from './routes/shares.js';
import adminRoutes from './routes/admin.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';
import { initializeSentry, sentryErrorHandler } from './utils/sentry.js';
import { 
  httpMetricsMiddleware, 
  metricsEndpoint, 
  healthCheck, 
  gracefulShutdown,
  trackWebSocketConnection,
  trackWebSocketMessage 
} from './utils/monitoring.js';
import { initializeTelemetry, shutdownTelemetry } from './utils/telemetry.js';
import { prisma } from './database/prisma.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize telemetry and monitoring
initializeTelemetry();

// Initialize Sentry
initializeSentry(app);

// Sentry request handler must be first middleware
app.use(Sentry.Handlers.requestHandler());

// Sentry tracing handler
app.use(Sentry.Handlers.tracingHandler());

// Metrics middleware
app.use(httpMetricsMiddleware());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Rate limiting
app.use('/api/', rateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint with detailed status
app.get('/api/health', healthCheck({
  database: prisma,
  redis: null, // Add Redis client when available
  s3: null, // Add S3 client when available
}));

// Metrics endpoint
app.get('/api/metrics', metricsEndpoint());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// WebSocket handling
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { id: socket.id });
  trackWebSocketConnection(true);

  socket.on('auth', async (data) => {
    try {
      trackWebSocketMessage('incoming', 'auth');
      
      // Verify token
      const user = await verifyToken(data.token);
      socket.userId = user.id;
      socket.join(`user:${user.id}`);
      
      socket.emit('auth:success');
      trackWebSocketMessage('outgoing', 'auth:success');
    } catch (error) {
      socket.emit('auth:error', { message: 'Authentication failed' });
      trackWebSocketMessage('outgoing', 'auth:error');
      socket.disconnect();
    }
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { id: socket.id });
    trackWebSocketConnection(false);
  });
});

// Sentry error handler must be before any other error middleware
app.use(sentryErrorHandler());

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Start graceful shutdown
  await gracefulShutdown(server, {
    database: prisma,
    redis: null, // Add Redis client when available
  });
  
  // Shutdown telemetry
  await shutdownTelemetry();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export for testing
export { app, io };

// Helper function to verify JWT token
async function verifyToken(token) {
  // Implementation would verify JWT and return user
  // This is a placeholder
  return { id: '123', email: 'user@example.com' };
}