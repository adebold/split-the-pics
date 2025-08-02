import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { logger } from './logger.js';

let sdk;

export function initializeTelemetry() {
  if (!process.env.ENABLE_TELEMETRY || process.env.ENABLE_TELEMETRY === 'false') {
    logger.info('OpenTelemetry disabled');
    return;
  }

  try {
    // Configure resource
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'securesnap-backend',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      })
    );

    // Configure Prometheus exporter for metrics
    const prometheusExporter = new PrometheusExporter({
      port: 9090,
      endpoint: '/metrics',
    }, () => {
      logger.info('Prometheus metrics server started on port 9090');
    });

    // Configure SDK
    sdk = new NodeSDK({
      resource,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
        }),
      ],
      metricReader: prometheusExporter,
    });

    // Start SDK
    sdk.start();
    
    logger.info('OpenTelemetry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry:', error);
  }
}

export async function shutdownTelemetry() {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry shut down successfully');
    } catch (error) {
      logger.error('Error shutting down OpenTelemetry:', error);
    }
  }
}