# SecureSnap - Private Photo Sharing Platform

<p align="center">
  <img src="public/logo.svg" alt="SecureSnap Logo" width="200" />
</p>

<p align="center">
  <strong>Share photos securely with face detection and end-to-end encryption</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#security">Security</a> •
  <a href="#license">License</a>
</p>

---

## 🌟 Features

### Security & Privacy
- **End-to-End Encryption**: Photos are encrypted before leaving your device
- **Two-Factor Authentication**: TOTP-based 2FA with backup codes
- **QR Code Login**: Passwordless authentication via QR codes
- **Time-Limited Shares**: Links that automatically expire
- **Privacy-First Face Detection**: All processing happens on-device
- **Canadian Data Sovereignty**: Hosted in Canada for privacy protection

### Photo Management
- **Smart Face Grouping**: Automatically organize photos by faces
- **Bulk Upload**: Upload multiple photos with progress tracking
- **Offline Support**: Works offline and syncs when connected
- **Image Compression**: Adaptive quality based on network speed
- **Share Controls**: Set view limits, expiration, and permissions

### Mobile Experience
- **Progressive Web App**: Install on any device
- **Touch Gestures**: Pinch to zoom, swipe to navigate
- **Pull to Refresh**: Native-like refresh experience
- **Share Target API**: Share photos directly from other apps
- **Responsive Design**: Optimized for all screen sizes

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 6+
- AWS Account (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/securesnap.git
   cd securesnap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create database
   createdb securesnap

   # Run migrations
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Start backend
   npm run server:dev

   # Terminal 2: Start frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🏗️ Project Structure

```
securesnap/
├── src/
│   ├── client/          # Frontend (Preact + Alpine.js)
│   │   ├── components/  # Reusable UI components
│   │   ├── services/    # API clients, storage, auth
│   │   ├── views/       # Page components
│   │   └── utils/       # Helpers and utilities
│   ├── server/          # Backend (Express.js)
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Express middleware
│   │   ├── models/      # Database models
│   │   ├── routes/      # API routes
│   │   └── services/    # Business logic
│   └── shared/          # Shared types and constants
├── public/              # Static assets
├── infrastructure/      # Deployment configs
│   ├── terraform/       # Infrastructure as Code
│   └── docker/          # Container configs
└── tests/               # Test suites
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run server:dev       # Start backend with hot reload

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Format with Prettier

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed test data
npm run db:reset         # Reset database
```

### Technology Stack

**Frontend:**
- Preact (3KB React alternative)
- Alpine.js (Reactive UI)
- Vite (Build tool)
- Workbox (Service Worker)
- MediaPipe (Face Detection)

**Backend:**
- Node.js + Express
- PostgreSQL (Database)
- Redis (Cache & Sessions)
- Socket.io (Real-time)
- JWT (Authentication)

**Infrastructure:**
- AWS (ca-central-1 region)
- CloudFront CDN
- S3 (Object Storage)
- RDS (PostgreSQL)
- ElastiCache (Redis)

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### AWS Deployment

1. **Configure AWS CLI**
   ```bash
   aws configure
   # Use ca-central-1 region
   ```

2. **Deploy infrastructure**
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Deploy application**
   ```bash
   npm run build
   npm run deploy
   ```

### Environment Variables

Key environment variables (see `.env.example` for full list):

```bash
# Application
NODE_ENV=production
PORT=5000

# Security
JWT_SECRET=<strong-secret>
ENCRYPTION_KEY=<32-character-key>

# Database
DATABASE_URL=postgresql://user:pass@host:5432/securesnap

# AWS (Canada Region)
AWS_REGION=ca-central-1
AWS_S3_BUCKET=securesnap-photos-ca

# Redis
REDIS_URL=redis://localhost:6379
```

## 🔒 Security

### Security Features

- **Encryption**: AES-256-GCM for data at rest
- **Transport**: TLS 1.3 for all connections
- **Authentication**: JWT with refresh tokens
- **2FA**: TOTP (RFC 6238) implementation
- **CORS**: Strict origin validation
- **CSP**: Content Security Policy headers
- **Rate Limiting**: Per-endpoint limits
- **Input Validation**: Comprehensive sanitization

### Security Best Practices

1. **Regular Updates**: Keep dependencies updated
   ```bash
   npm audit
   npm update
   ```

2. **Environment Security**:
   - Never commit `.env` files
   - Use AWS Secrets Manager in production
   - Rotate keys regularly

3. **Monitoring**:
   - Enable AWS CloudWatch
   - Set up Sentry error tracking
   - Monitor failed login attempts

## 📊 Performance

### Optimization Techniques

- **Code Splitting**: Dynamic imports for routes
- **Image Optimization**: WebP with fallbacks
- **Lazy Loading**: Intersection Observer API
- **Service Worker**: Offline caching strategy
- **CDN**: CloudFront distribution
- **Compression**: Brotli + Gzip

### Performance Metrics

Target metrics:
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse Score: > 90

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

### Test Coverage

Maintain minimum coverage:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for face detection
- [Preact](https://preactjs.com/) for the lightweight React alternative
- [Alpine.js](https://alpinejs.dev/) for reactive UI
- Canadian hosting providers for data sovereignty

---

<p align="center">
  Made with ❤️ for privacy and security
</p>