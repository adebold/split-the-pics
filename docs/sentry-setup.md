# Sentry Error Tracking Setup

This guide explains how to set up and configure Sentry for error tracking in SecureSnap.

## Overview

Sentry provides real-time error tracking and performance monitoring for SecureSnap. It helps identify, debug, and resolve issues in production.

## Features

- **Error Tracking**: Automatic capture of unhandled exceptions and errors
- **Performance Monitoring**: Track API response times and database queries
- **User Context**: Associate errors with specific users
- **Release Tracking**: Track errors by application version
- **Custom Breadcrumbs**: Detailed trail of events leading to errors
- **Sensitive Data Filtering**: Automatic redaction of passwords and tokens

## Setup Instructions

### 1. Create Sentry Account

1. Sign up at [sentry.io](https://sentry.io)
2. Create a new project:
   - Platform: Node.js
   - Project name: securesnap-backend

### 2. Get DSN

1. Go to Settings → Projects → securesnap-backend
2. Copy the DSN from "Client Keys (DSN)"

### 3. Configure Environment Variables

```bash
# .env file
SENTRY_DSN="https://YOUR_DSN@sentry.io/PROJECT_ID"
SENTRY_ENVIRONMENT="production"
SENTRY_RELEASE="1.0.0"
```

### 4. Configure Releases (CI/CD)

Add to your deployment script:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Create release
export SENTRY_AUTH_TOKEN="your-auth-token"
export SENTRY_ORG="your-org"
export SENTRY_PROJECT="securesnap-backend"

VERSION=$(git rev-parse --short HEAD)
sentry-cli releases new $VERSION
sentry-cli releases set-commits $VERSION --auto
sentry-cli releases finalize $VERSION

# Update environment variable
export SENTRY_RELEASE=$VERSION
```

## Configuration

### Error Filtering

The Sentry configuration automatically filters out:
- 404 Not Found errors
- Validation errors
- Sensitive data (passwords, tokens, API keys)
- Debug console logs

### Performance Monitoring

- **Sample Rate**: 10% in production, 100% in development
- **Profiling**: Enabled for performance bottleneck detection
- **Database Query Tracking**: Integrated with Prisma

### Custom Events

```javascript
import { captureEvent, addBreadcrumb } from './utils/sentry.js';

// Log custom event
captureEvent('User uploaded large file', 'info', {
  fileSize: file.size,
  mimeType: file.mimetype,
});

// Add breadcrumb
addBreadcrumb('Processing image', 'image', 'info', {
  imageId: image.id,
  operation: 'resize',
});
```

### Performance Measurement

```javascript
import { measurePerformance } from './utils/sentry.js';

// Measure function performance
const result = await measurePerformance('image-processing', async () => {
  return await processImage(imageData);
});
```

## Alerts and Notifications

### Setting Up Alerts

1. Go to Alerts → Create Alert Rule
2. Configure conditions:
   - Error rate spike
   - New error types
   - Performance degradation
   - Quota usage

### Recommended Alert Rules

1. **High Error Rate**
   - Condition: Error count > 100 in 5 minutes
   - Action: Email + Slack notification

2. **New Error Type**
   - Condition: First seen error
   - Action: Email to dev team

3. **Performance Degradation**
   - Condition: P95 response time > 1s
   - Action: PagerDuty alert

4. **Database Errors**
   - Condition: Database connection errors > 10
   - Action: Immediate alert

## Dashboard Setup

### Key Metrics to Monitor

1. **Error Rate**: Errors per minute/hour
2. **User Impact**: Number of users affected
3. **Performance**: API response times
4. **Database**: Query performance
5. **Release Health**: Error rate by version

### Custom Dashboards

Create dashboards for:
- Authentication errors
- File upload failures
- Database performance
- API endpoint health

## Best Practices

### 1. User Privacy

- Never log sensitive user data
- Use email hashing for user identification
- Implement data scrubbing rules

### 2. Error Context

Always include relevant context:
```javascript
Sentry.withScope((scope) => {
  scope.setTag('feature', 'photo-upload');
  scope.setContext('photo', {
    size: photo.size,
    type: photo.mimetype,
  });
  Sentry.captureException(error);
});
```

### 3. Breadcrumbs

Add breadcrumbs for important operations:
```javascript
addBreadcrumb('Photo upload started', 'upload', 'info', {
  photoId: photo.id,
  size: photo.size,
});
```

### 4. Performance Transactions

Track important transactions:
```javascript
const transaction = startTransaction('photo-processing');
// ... process photo
transaction.finish();
```

## Debugging with Sentry

### Finding Root Causes

1. Check the error details page
2. Review breadcrumbs trail
3. Examine stack traces
4. Check user actions timeline
5. Review related errors

### Using Issue Grouping

Sentry automatically groups similar errors. You can:
- Merge related issues
- Split incorrectly grouped issues
- Set fingerprinting rules

## Integration with Other Tools

### Slack Integration

1. Go to Settings → Integrations → Slack
2. Configure webhook
3. Set up alert rules to send to Slack

### GitHub Integration

1. Link Sentry to GitHub repository
2. Create issues directly from Sentry
3. View suspect commits

### JIRA Integration

1. Connect Sentry to JIRA
2. Create tickets from error reports
3. Track resolution status

## Troubleshooting

### Common Issues

1. **Events not appearing**
   - Check DSN configuration
   - Verify network connectivity
   - Check rate limits

2. **Missing user context**
   - Ensure `setUserContext` is called
   - Verify user data is available

3. **Performance issues**
   - Reduce sample rate
   - Disable profiling in development

### Debug Mode

Enable debug mode for troubleshooting:
```javascript
Sentry.init({
  debug: true,
  // ... other config
});
```

## Security Considerations

1. **API Keys**: Never expose Sentry auth tokens
2. **DSN**: Safe to expose (client-side)
3. **PII**: Configure data scrubbing rules
4. **Compliance**: Enable GDPR features if needed

## Cost Management

### Quota Usage

- Monitor quota usage in Sentry dashboard
- Set up quota alerts
- Implement sampling for high-traffic

### Optimization Tips

1. Filter out noisy errors
2. Use appropriate sample rates
3. Archive old issues
4. Set retention policies

## Maintenance

### Regular Tasks

1. **Weekly**: Review new error types
2. **Monthly**: Clean up resolved issues
3. **Quarterly**: Review alert rules
4. **Yearly**: Audit data retention

### Version Updates

Keep Sentry SDK updated:
```bash
npm update @sentry/node @sentry/profiling-node
```

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Best Practices Guide](https://docs.sentry.io/product/best-practices/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Data Security](https://sentry.io/security/)