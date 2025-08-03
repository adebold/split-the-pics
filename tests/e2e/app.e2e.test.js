const request = require('supertest');
const { faker } = require('@faker-js/faker');

// Using the actual running app
const API_URL = 'http://localhost:5000';
const APP_URL = 'http://localhost:3000';

describe('SecureSnap E2E Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create a test user
    testUser = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      name: faker.person.fullName()
    };
  });

  describe('Health Check', () => {
    test('Backend API should be healthy', async () => {
      const response = await request(API_URL)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        checks: {
          database: { status: 'healthy' }
        }
      });
    });

    test('Frontend should serve HTML', async () => {
      const response = await request(APP_URL)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('SecureSnap');
    });
  });

  describe('Authentication Flow', () => {
    test('Should register a new user', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      
      authToken = response.body.accessToken;
    });

    test('Should not register duplicate user', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409); // Conflict status for duplicate

      expect(response.body).toHaveProperty('error');
    });

    test('Should login with valid credentials', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    test('Should reject invalid credentials', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('Should get user profile with valid token', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    test('Should reject request without token', async () => {
      await request(API_URL)
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('Photo Management', () => {
    let photoId;

    test('Should get empty photo list initially', async () => {
      const response = await request(API_URL)
        .get('/api/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('photos');
      expect(Array.isArray(response.body.photos)).toBe(true);
      expect(response.body.photos.length).toBe(0);
    });

    test('Should handle photo upload (mock)', async () => {
      // Note: Actual file upload would require a real file
      // This tests the endpoint exists and requires auth
      const response = await request(API_URL)
        .post('/api/photos/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400); // Expect 400 because no file is provided

      expect(response.body).toHaveProperty('error');
    });

    test('Should reject photo operations without auth', async () => {
      await request(API_URL)
        .get('/api/photos')
        .expect(401);

      await request(API_URL)
        .post('/api/photos/upload')
        .expect(401);
    });
  });

  describe('User Storage', () => {
    test('Should get user storage info', async () => {
      const response = await request(API_URL)
        .get('/api/user/storage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('used');
      expect(response.body).toHaveProperty('quota');
      expect(typeof response.body.used).toBe('number');
      expect(typeof response.body.quota).toBe('number');
    });
  });

  describe('Share Links', () => {
    test('Should create a share link', async () => {
      const response = await request(API_URL)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          photoIds: [], // Empty for now
          expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
        })
        .expect(201);

      expect(response.body).toHaveProperty('shareLink');
      expect(response.body.shareLink).toHaveProperty('token');
      expect(response.body.shareLink).toHaveProperty('expiresAt');
    });

    test('Should list user share links', async () => {
      const response = await request(API_URL)
        .get('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('shareLinks');
      expect(Array.isArray(response.body.shareLinks)).toBe(true);
      expect(response.body.shareLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Two-Factor Authentication', () => {
    test('Should get 2FA status', async () => {
      const response = await request(API_URL)
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body.enabled).toBe(false); // Initially disabled
    });

    test('Should initiate 2FA setup', async () => {
      const response = await request(API_URL)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('secret');
    });
  });

  describe('Frontend Routes', () => {
    const routes = ['/', '/login', '/photos', '/upload', '/settings'];

    routes.forEach(route => {
      test(`Should serve ${route} route`, async () => {
        const response = await request(APP_URL)
          .get(route)
          .expect(200);

        expect(response.text).toContain('<!DOCTYPE html>');
      });
    });
  });

  describe('API Error Handling', () => {
    test('Should return 404 for unknown endpoints', async () => {
      const response = await request(API_URL)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('Should handle malformed JSON', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    test('API should have security headers', async () => {
      const response = await request(API_URL)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });
});