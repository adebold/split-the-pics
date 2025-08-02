# Contributing to SecureSnap

Thank you for your interest in contributing to SecureSnap! We welcome contributions from the community and are grateful for any help you can provide.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in our [Issues](https://github.com/securesnap/securesnap/issues)
2. If not, create a new issue using the bug report template
3. Provide as much detail as possible, including steps to reproduce

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue using the feature request template
3. Explain the use case and how it would benefit users

### Security Vulnerabilities

- **DO NOT** create public issues for security vulnerabilities
- Email security@securesnap.com with details
- We'll respond within 48 hours

## Development Process

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/securesnap.git
   cd securesnap
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

5. Set up the database:
   ```bash
   docker-compose up -d postgres redis
   npx prisma migrate dev
   npm run db:seed
   ```

6. Start development servers:
   ```bash
   npm run dev:all
   ```

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Write/update tests for your changes

4. Run tests and linting:
   ```bash
   npm run lint
   npm test
   ```

5. Commit your changes:
   ```bash
   git commit -m "feat: add new feature"
   ```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

### Pull Request Process

1. Push your branch to your fork
2. Create a Pull Request to our `develop` branch
3. Fill out the PR template completely
4. Ensure all CI checks pass
5. Wait for review from maintainers

### Code Review

- Respond to review comments promptly
- Make requested changes in new commits
- Don't force-push during review
- Mark conversations as resolved when addressed

## Coding Standards

### JavaScript/TypeScript

- Use ES6+ features
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful variable names
- Add JSDoc comments for functions

### React/Preact

- Use functional components with hooks
- Follow component naming conventions
- Keep components small and focused
- Write unit tests for components

### Testing

- Write tests for new features
- Maintain test coverage above 80%
- Use descriptive test names
- Test edge cases

### Security

- Never commit secrets or credentials
- Validate all user input
- Use parameterized queries
- Follow OWASP guidelines

## Project Structure

```
securesnap/
├── src/
│   ├── client/         # Frontend code
│   │   ├── components/ # Reusable components
│   │   ├── views/      # Page components
│   │   ├── services/   # API and service layers
│   │   └── utils/      # Utility functions
│   └── server/         # Backend code
│       ├── routes/     # API routes
│       ├── services/   # Business logic
│       ├── middleware/ # Express middleware
│       └── utils/      # Server utilities
├── prisma/             # Database schema
├── public/             # Static assets
├── tests/              # Test files
└── infrastructure/     # Deployment configs
```

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- Prisma
- GitLens
- REST Client

### Useful Commands

```bash
# Development
npm run dev           # Start frontend dev server
npm run server:dev    # Start backend dev server
npm run dev:all       # Start both servers

# Database
npm run prisma:studio # Open Prisma Studio
npm run db:migrate    # Run migrations
npm run db:seed       # Seed database

# Testing
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
```

## Release Process

1. Features are developed in feature branches
2. PRs are merged to `develop`
3. `develop` is merged to `main` for releases
4. Releases are tagged with semantic versioning

## Getting Help

- Check our [documentation](https://docs.securesnap.com)
- Join our [Discord community](https://discord.gg/securesnap)
- Ask questions in GitHub Discussions

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor spotlight

Thank you for contributing to SecureSnap! 🎉