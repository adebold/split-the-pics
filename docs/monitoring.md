# Application Monitoring Guide

This guide covers the monitoring and observability setup for SecureSnap, including metrics, logging, tracing, and alerting.

## Overview

SecureSnap uses a comprehensive monitoring stack:
- **Prometheus**: Metrics collection and storage
- **OpenTelemetry**: Distributed tracing and instrumentation
- **CloudWatch**: AWS infrastructure monitoring
- **Sentry**: Error tracking and performance monitoring
- **Custom Metrics**: Business and application-specific metrics

## Metrics

### Available Metrics

#### HTTP Metrics
- `securesnap_http_requests_total`: Total HTTP requests by method, route, and status
- `securesnap_http_request_duration_seconds`: Request latency histogram

#### Authentication Metrics  
- `securesnap_auth_attempts_total`: Authentication attempts by method and status
- `securesnap_active_sessions`: Current number of active user sessions

#### Photo Metrics
- `securesnap_photos_uploaded_total`: Total photos uploaded
- `securesnap_photo_upload_size_bytes`: Photo upload size distribution
- `securesnap_photo_processing_duration_seconds`: Processing time by operation

#### Database Metrics
- `securesnap_db_connections_active`: Active database connections
- `securesnap_db_query_duration_seconds`: Query duration by operation and table

#### Cache Metrics
- `securesnap_cache_hits_total`: Cache hit count
- `securesnap_cache_misses_total`: Cache miss count

#### WebSocket Metrics
- `securesnap_websocket_connections_active`: Active WebSocket connections
- `securesnap_websocket_messages_total`: Messages by direction and type

#### Business Metrics
- `securesnap_share_links_created_total`: Share links created
- `securesnap_share_links_accessed_total`: Share link accesses
- `securesnap_storage_used_bytes`: Storage usage by bucket

#### System Metrics
- `securesnap_errors_total`: Errors by type and severity
- `securesnap_rate_limit_hits_total`: Rate limit hits by endpoint

### Accessing Metrics

Metrics are exposed at `/api/metrics` in Prometheus format:

```bash
curl http://localhost:5000/api/metrics
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'securesnap'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/metrics'
```

## Health Checks

### Endpoint

The health check endpoint provides detailed system status:

```bash
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "s3": { "status": "healthy" },
    "memory": {
      "status": "healthy",
      "usage": {
        "heapUsed": "120 MB",
        "heapTotal": "512 MB",
        "rss": "180 MB"
      }
    },
    "cpu": {
      "status": "healthy",
      "usage": {
        "user": "1200 ms",
        "system": "300 ms"
      }
    }
  }
}
```

### Health Check Configuration

Configure health check probes in Kubernetes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Logging

### Log Levels

- **ERROR**: Application errors, exceptions
- **WARN**: Warnings, deprecated features, performance issues
- **INFO**: General information, user actions
- **HTTP**: HTTP request logs
- **DEBUG**: Detailed debugging information

### Log Format

Logs are in JSON format for easy parsing:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "User authenticated",
  "userId": "user-123",
  "method": "jwt",
  "ip": "192.168.1.1"
}
```

### CloudWatch Integration

Logs are automatically sent to CloudWatch Logs:
- Application logs: `/ecs/securesnap-[environment]`
- HTTP access logs: `/ecs/securesnap-[environment]/http`
- Error logs: `/ecs/securesnap-[environment]/error`

### Log Aggregation

Use CloudWatch Insights for log analysis:

```sql
-- Find all errors in the last hour
fields @timestamp, message, error, userId
| filter level = "error"
| sort @timestamp desc
| limit 100

-- Track authentication failures
fields @timestamp, email, ip
| filter message = "Authentication failed"
| stats count() by ip
```

## Distributed Tracing

### OpenTelemetry Setup

Tracing is automatically enabled for:
- HTTP requests
- Database queries
- Redis operations
- External API calls

### Trace Context

Traces include:
- Request ID
- User ID
- Operation name
- Duration
- Status

### Viewing Traces

Traces can be viewed in:
- AWS X-Ray (production)
- Jaeger (development)

## Custom Instrumentation

### Adding Custom Metrics

```javascript
import { metrics } from './utils/monitoring.js';

// Increment counter
metrics.photosUploadedTotal.inc({ status: 'success' });

// Record histogram
metrics.photoProcessingDuration.observe({ operation: 'resize' }, 2.5);

// Update gauge
metrics.activeSessionsGauge.set(150);
```

### Adding Performance Monitoring

```javascript
import { PerformanceMonitor } from './utils/monitoring.js';

const monitor = new PerformanceMonitor('image-processing');
// ... perform operation
const duration = monitor.end();
logger.info(`Image processed in ${duration}s`);
```

### Adding Custom Traces

```javascript
import { startTransaction } from './utils/sentry.js';

const transaction = startTransaction('process-upload');
// ... perform operation
transaction.finish();
```

## Alerting

### Prometheus Alert Rules

```yaml
groups:
  - name: securesnap
    rules:
      - alert: HighErrorRate
        expr: rate(securesnap_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate detected
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database is down
          
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1e9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: High memory usage
```

### CloudWatch Alarms

Create alarms for:
- ECS task failures
- High CPU/memory usage
- Database connection failures
- API latency

## Dashboards

### Grafana Dashboard

Import the SecureSnap dashboard:

```json
{
  "dashboard": {
    "title": "SecureSnap Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(securesnap_http_requests_total[5m])"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(securesnap_errors_total[5m])"
        }]
      },
      {
        "title": "Response Time",
        "targets": [{
          "expr": "histogram_quantile(0.95, securesnap_http_request_duration_seconds)"
        }]
      }
    ]
  }
}
```

### Key Metrics to Monitor

1. **Golden Signals**
   - Request rate
   - Error rate
   - Latency (P50, P95, P99)
   - Saturation (CPU, memory, connections)

2. **Business Metrics**
   - Active users
   - Photos uploaded per hour
   - Storage usage trends
   - Share link usage

3. **Infrastructure**
   - Database connections
   - Cache hit rate
   - Queue depth
   - Disk usage

## Performance Optimization

### Identifying Bottlenecks

1. Check slow query logs:
```javascript
metrics.dbQueryDuration.observe({ operation: 'select', table: 'photos' }, 0.5);
```

2. Monitor cache effectiveness:
```javascript
const hitRate = metrics.cacheHitsTotal / (metrics.cacheHitsTotal + metrics.cacheMissesTotal);
```

3. Track API endpoint performance:
```javascript
metrics.httpRequestDuration.observe({ route: '/api/photos' }, duration);
```

### Performance Tips

1. **Database**
   - Index frequently queried columns
   - Use connection pooling
   - Optimize N+1 queries

2. **Caching**
   - Cache expensive computations
   - Use Redis for session storage
   - Implement cache warming

3. **Application**
   - Use streaming for large files
   - Implement request batching
   - Optimize image processing

## Troubleshooting

### Common Issues

1. **Metrics not appearing**
   - Check Prometheus configuration
   - Verify metrics endpoint is accessible
   - Check for firewall rules

2. **Missing traces**
   - Verify OpenTelemetry is initialized
   - Check sampling configuration
   - Ensure trace headers are propagated

3. **High memory usage**
   - Check for memory leaks
   - Review cache size limits
   - Monitor connection pools

### Debug Mode

Enable debug metrics:
```javascript
process.env.DEBUG_METRICS = 'true';
```

## Security Considerations

1. **Metrics Endpoint**
   - Consider authentication for `/api/metrics`
   - Use IP whitelisting for Prometheus

2. **Sensitive Data**
   - Don't include PII in metrics
   - Sanitize error messages
   - Hash user identifiers

3. **Rate Limiting**
   - Protect metrics endpoint
   - Implement scrape limits
   - Monitor for abuse

## Cost Optimization

1. **Metric Cardinality**
   - Limit label combinations
   - Use bounded sets for labels
   - Archive old metrics

2. **Log Retention**
   - Set appropriate retention periods
   - Use log levels effectively
   - Compress archived logs

3. **Trace Sampling**
   - Adjust sampling rates
   - Sample by importance
   - Use head-based sampling

## Maintenance

### Regular Tasks

1. **Daily**
   - Check error rates
   - Monitor disk usage
   - Review alerts

2. **Weekly**
   - Analyze performance trends
   - Review slow queries
   - Update dashboards

3. **Monthly**
   - Audit metric usage
   - Clean up unused metrics
   - Review retention policies

### Monitoring the Monitors

Ensure monitoring systems are healthy:
- Prometheus disk usage
- CloudWatch costs
- Alert fatigue metrics

## Integration with CI/CD

### Deployment Metrics

Track deployment success:
```javascript
metrics.deploymentTotal.inc({ status: 'success', environment: 'production' });
```

### Performance Regression Detection

Compare metrics before/after deployment:
- Response time changes
- Error rate changes
- Resource usage changes

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [OpenTelemetry Guide](https://opentelemetry.io/docs/)
- [CloudWatch Best Practices](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)