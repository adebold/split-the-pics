import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticateToken, authenticate2FA } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { userService } from '../services/userService.js';
import { emailService } from '../services/emailService.js';
import { twoFactorService } from '../services/twoFactorService.js';
import { qrAuthService } from '../services/qrAuthService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').trim().isLength({ min: 2, max: 50 }),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Register new user
router.post('/register', rateLimiter, validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await userService.create({
      email,
      password: hashedPassword,
      name,
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await userService.saveRefreshToken(user.id, refreshToken);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
router.post('/login', rateLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await userService.recordFailedLogin(user.id);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ 
        message: 'Account temporarily locked due to multiple failed attempts' 
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const sessionToken = generateSessionToken();
      await userService.saveSessionToken(user.id, sessionToken);
      
      return res.json({
        requires2FA: true,
        sessionToken,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await userService.saveRefreshToken(user.id, refreshToken);

    // Record successful login
    await userService.recordSuccessfulLogin(user.id, req.ip);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Verify 2FA code
router.post('/2fa/verify', rateLimiter, async (req, res) => {
  try {
    const { sessionToken, code, method, rememberDevice } = req.body;

    // Verify session token
    const userId = await userService.verifySessionToken(sessionToken);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    const user = await userService.findById(userId);

    // Verify 2FA code
    let isValid = false;
    if (method === 'totp') {
      isValid = await twoFactorService.verifyTOTP(user.twoFactorSecret, code);
    } else if (method === 'backup') {
      isValid = await twoFactorService.verifyBackupCode(user.id, code);
    }

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid code' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await userService.saveRefreshToken(user.id, refreshToken);

    // Generate device token if requested
    let deviceToken = null;
    if (rememberDevice) {
      deviceToken = generateDeviceToken();
      await userService.saveTrustedDevice(user.id, deviceToken, req.headers['user-agent']);
    }

    // Clear session token
    await userService.clearSessionToken(sessionToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
      deviceToken,
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    res.status(500).json({ message: '2FA verification failed' });
  }
});

// QR Code Authentication
router.post('/qr/session', rateLimiter, async (req, res) => {
  try {
    const { deviceInfo } = req.body;
    
    const session = await qrAuthService.createSession(deviceInfo);
    
    res.json({
      sessionId: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    logger.error('QR session creation error:', error);
    res.status(500).json({ message: 'Failed to create QR session' });
  }
});

// QR Code status polling
router.get('/qr/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const status = await qrAuthService.getSessionStatus(sessionId);
    
    if (status.authenticated) {
      const user = await userService.findById(status.userId);
      
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      await userService.saveRefreshToken(user.id, refreshToken);
      
      res.json({
        status: 'authenticated',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      });
    } else {
      res.json({ status: status.status });
    }
  } catch (error) {
    logger.error('QR status check error:', error);
    res.status(500).json({ message: 'Failed to check QR status' });
  }
});

// Magic link authentication
router.post('/magic-link', rateLimiter, async (req, res) => {
  try {
    const { email, redirectUrl } = req.body;

    const user = await userService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If an account exists, a magic link has been sent' });
    }

    const token = generateMagicLinkToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await userService.saveMagicLinkToken(user.id, token, expiresAt);

    const magicLink = `${process.env.CLIENT_URL}/auth/magic/${token}?redirect=${encodeURIComponent(redirectUrl || '/')}`;
    
    await emailService.sendMagicLink(user.email, user.name, magicLink);

    res.json({ 
      message: 'If an account exists, a magic link has been sent',
      expiresAt,
    });
  } catch (error) {
    logger.error('Magic link error:', error);
    res.status(500).json({ message: 'Failed to send magic link' });
  }
});

// Verify magic link
router.post('/magic-link/verify', rateLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    const user = await userService.verifyMagicLinkToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired link' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await userService.saveRefreshToken(user.id, refreshToken);
    await userService.clearMagicLinkToken(token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Magic link verification error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if token exists in database
    const isValid = await userService.verifyRefreshToken(decoded.userId, refreshToken);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await userService.findById(decoded.userId);
    const accessToken = generateAccessToken(user);

    res.json({ accessToken });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await userService.revokeRefreshToken(req.user.id, refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userService.findById(req.user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
});

// Helper functions
function generateAccessToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      type: 'access',
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { 
      userId: user.id,
      type: 'refresh',
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateDeviceToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateMagicLinkToken() {
  return crypto.randomBytes(32).toString('hex');
}

export default router;