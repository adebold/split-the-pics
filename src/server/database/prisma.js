import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Create a single instance of PrismaClient
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Middleware to log slow queries
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  const duration = after - before;
  
  // Log slow queries (> 100ms)
  if (duration > 100) {
    logger.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
  }
  
  return result;
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});