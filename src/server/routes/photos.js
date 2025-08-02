import express from 'express';
import { authenticateToken, authenticate2FA } from '../middleware/auth.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// TODO: Implement photo routes
// - POST /upload - Upload new photo
// - GET /:id - Get photo details
// - DELETE /:id - Delete photo
// - GET /album/:albumId - Get photos in album
// - PUT /:id/faces - Update face detection results

router.get('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Photos API - Coming soon' });
});

export default router;