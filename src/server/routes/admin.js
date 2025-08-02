import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma.js';

const router = express.Router();

// Admin credentials (in production, these should be environment variables)
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'admin@securesnap.com',
  password: process.env.ADMIN_PASSWORD || 'admin123' // Change this!
};

// Admin authentication middleware
const requireAdminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid admin token' });
  }
};

// Admin login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate admin credentials
    if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate admin token
    const accessToken = jwt.sign(
      { 
        email: email,
        isAdmin: true,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { 
        email: email,
        isAdmin: true,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      accessToken,
      refreshToken,
      admin: {
        email: email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// Get dashboard statistics
router.get('/stats/dashboard', requireAdminAuth, async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    // Get photo statistics
    const totalPhotos = await prisma.photo.count();
    const recentUploads = await prisma.photo.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
    const totalShares = await prisma.share.count();

    // Calculate storage usage (mock data for now)
    const storageUsed = totalPhotos * 2.5 * 1024 * 1024; // Estimate 2.5MB per photo
    const storageTotal = 1024 * 1024 * 1024 * 1024; // 1TB

    // Revenue statistics (mock data for now)
    const mrr = totalUsers * 9.99; // Assume $9.99/month average
    const arr = mrr * 12;
    const growth = 15.5; // 15.5% growth

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers
      },
      photos: {
        total: totalPhotos,
        uploads: recentUploads,
        shares: totalShares
      },
      storage: {
        used: storageUsed,
        total: storageTotal
      },
      revenue: {
        mrr: mrr,
        arr: arr,
        growth: growth
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
});

// Get user analytics
router.get('/analytics/users', requireAdminAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Get daily user registrations
    const userRegistrations = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: true,
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get user activity
    const userActivity = await prisma.user.groupBy({
      by: ['lastLoginAt'],
      where: {
        lastLoginAt: { 
          gte: startDate,
          not: null
        }
      },
      _count: true,
      orderBy: {
        lastLoginAt: 'asc'
      }
    });

    res.json({
      registrations: userRegistrations,
      activity: userActivity
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to load user analytics' });
  }
});

// Get system health
router.get('/monitoring/health', requireAdminAuth, async (req, res) => {
  try {
    // Database health check
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    // Memory usage
    const memUsage = process.memoryUsage();
    
    // System uptime
    const uptime = process.uptime();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        latency: dbLatency
      },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        external: memUsage.external
      },
      uptime: uptime,
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get recent activity logs
router.get('/monitoring/logs', requireAdminAuth, async (req, res) => {
  try {
    const { limit = 100, level = 'all' } = req.query;

    // Mock activity logs (in production, integrate with your logging system)
    const logs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'User registered',
        details: { userId: 'user_123', email: 'user@example.com' }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'info',
        message: 'Photo uploaded',
        details: { userId: 'user_456', photoId: 'photo_789' }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: 'warning',
        message: 'High memory usage detected',
        details: { memoryUsage: '85%' }
      }
    ];

    res.json({
      logs: logs.slice(0, parseInt(limit)),
      total: logs.length
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: 'Failed to load activity logs' });
  }
});

// Get user list with pagination
router.get('/users', requireAdminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            photos: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: parseInt(limit)
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

export default router;