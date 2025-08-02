import jwt from 'jsonwebtoken';
import { userService } from '../services/userService.js';
import { logger } from '../utils/logger.js';
import { setUserContext, addBreadcrumb } from '../utils/sentry.js';

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token type
    if (decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Get user
    const user = await userService.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    // Set Sentry user context
    setUserContext(req.user);
    
    // Add breadcrumb for successful authentication
    addBreadcrumb('User authenticated', 'auth', 'info', {
      userId: user.id,
      method: 'jwt',
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    logger.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
}

export async function authenticate2FA(req, res, next) {
  try {
    // Check for device token
    const deviceToken = req.headers['x-device-token'];
    
    if (deviceToken) {
      const isValidDevice = await userService.verifyTrustedDevice(
        req.user.id, 
        deviceToken
      );
      
      if (isValidDevice) {
        // Skip 2FA for trusted device
        next();
        return;
      }
    }

    // Check if user has 2FA enabled
    const user = await userService.findById(req.user.id);
    
    if (user.twoFactorEnabled) {
      // Require 2FA verification
      const twoFactorToken = req.headers['x-2fa-token'];
      
      if (!twoFactorToken) {
        return res.status(401).json({ 
          message: '2FA verification required',
          requires2FA: true,
        });
      }

      // Verify 2FA token
      const isValid = await userService.verify2FAToken(user.id, twoFactorToken);
      
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid 2FA token' });
      }
    }

    next();
  } catch (error) {
    logger.error('2FA authentication error:', error);
    res.status(500).json({ message: '2FA verification failed' });
  }
}

export function requireRole(role) {
  return async (req, res, next) => {
    try {
      const user = await userService.findById(req.user.id);
      
      if (!user.roles || !user.roles.includes(role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      res.status(500).json({ message: 'Authorization failed' });
    }
  };
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without authentication
    next();
    return;
  }

  // Try to authenticate
  authenticateToken(req, res, (err) => {
    if (err) {
      // Authentication failed, but continue anyway
      next();
    } else {
      next();
    }
  });
}