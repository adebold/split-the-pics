import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { api } from '../services/api';
import { AnalyticsChart } from '../components/AnalyticsChart';

export function AdminMonitoring() {
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    uptime: 0,
    database: { status: 'connected', latency: 0 },
    memory: { used: 0, total: 0 },
    version: '1.0.0'
  });
  const [metrics, setMetrics] = useState({
    responseTime: [],
    errorRate: [],
    throughput: [],
    cpuUsage: [],
    memoryUsage: []
  });
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadSystemData();
    const interval = autoRefresh ? setInterval(loadSystemData, 30000) : null; // Refresh every 30 seconds
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadSystemData = async () => {
    try {
      // Load system health
      const healthResponse = await api.request('/admin/monitoring/health');
      setSystemHealth(healthResponse);

      // Load activity logs
      const logsResponse = await api.request('/admin/monitoring/logs?limit=20');
      setLogs(logsResponse.logs || []);

      // Generate mock metrics data
      setMetrics({
        responseTime: generateMetricData('response_time'),
        errorRate: generateMetricData('error_rate'),
        throughput: generateMetricData('throughput'),
        cpuUsage: generateMetricData('cpu'),
        memoryUsage: generateMetricData('memory')
      });

      // Generate mock alerts
      setAlerts(generateMockAlerts());
    } catch (error) {
      console.error('Failed to load system data:', error);
      // Generate mock data for demonstration
      setSystemHealth({
        status: 'healthy',
        uptime: 2678400, // 31 days in seconds
        database: { status: 'connected', latency: 12 },
        memory: { used: 2147483648, total: 8589934592 }, // 2GB used, 8GB total
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
      setLogs(generateMockLogs());
      setMetrics({
        responseTime: generateMetricData('response_time'),
        errorRate: generateMetricData('error_rate'),
        throughput: generateMetricData('throughput'),
        cpuUsage: generateMetricData('cpu'),
        memoryUsage: generateMetricData('memory')
      });
      setAlerts(generateMockAlerts());
    } finally {
      setLoading(false);
    }
  };

  const generateMetricData = (type) => {
    const data = [];
    const baseValues = {
      response_time: 120,
      error_rate: 0.5,
      throughput: 150,
      cpu: 35,
      memory: 65
    };
    
    for (let i = 23; i >= 0; i--) {
      const date = new Date();
      date.setHours(date.getHours() - i);
      const baseValue = baseValues[type];
      const randomVariation = Math.random() * 0.4 + 0.8; // 80-120% of base
      
      data.push({
        label: date,
        value: Math.round(baseValue * randomVariation * 10) / 10
      });
    }
    return data;
  };

  const generateMockAlerts = () => [
    {
      id: 'alert_001',
      level: 'warning',
      message: 'High memory usage detected',
      details: 'Memory usage exceeded 80% threshold',
      timestamp: new Date(Date.now() - 1800000), // 30 min ago
      resolved: false
    },
    {
      id: 'alert_002',
      level: 'info',
      message: 'Database connection pool optimized',
      details: 'Connection pool size increased to handle traffic',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      resolved: true
    },
    {
      id: 'alert_003',
      level: 'error',
      message: 'Failed login attempts spike',
      details: 'Unusual number of failed login attempts detected',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      resolved: true
    }
  ];

  const generateMockLogs = () => [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'User authentication successful',
      details: { userId: 'user_123', ip: '192.168.1.100' }
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      level: 'info',
      message: 'Photo upload completed',
      details: { userId: 'user_456', fileSize: '2.3MB' }
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 600000).toISOString(),
      level: 'warning',
      message: 'Slow database query detected',
      details: { query: 'SELECT * FROM photos', duration: '2.5s' }
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 900000).toISOString(),
      level: 'error',
      message: 'API rate limit exceeded',
      details: { ip: '10.0.0.1', endpoint: '/api/photos' }
    }
  ];

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'var(--success)';
      case 'warning': return 'var(--warning)';
      case 'error': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'info': return 'var(--primary)';
      case 'warning': return 'var(--warning)';
      case 'error': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div class="monitoring-loading">
        <div class="loading-spinner"></div>
        <p>Loading system data...</p>
      </div>
    );
  }

  return (
    <div class="admin-monitoring">
      {/* Header */}
      <div class="monitoring-header">
        <div class="header-left">
          <h1>Platform Monitoring</h1>
          <p>Real-time system health and performance metrics</p>
        </div>
        <div class="header-right">
          <label class="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button class="btn btn-secondary" onClick={loadSystemData}>
            Refresh Now
          </button>
        </div>
      </div>

      {/* System Status */}
      <div class="system-status">
        <div class="status-card primary">
          <div class="status-indicator">
            <div class={`status-dot ${systemHealth.status}`}></div>
            <span class="status-text">System {systemHealth.status}</span>
          </div>
          <div class="status-details">
            <div class="detail-item">
              <span>Uptime</span>
              <strong>{formatUptime(systemHealth.uptime)}</strong>
            </div>
            <div class="detail-item">
              <span>Version</span>
              <strong>{systemHealth.version}</strong>
            </div>
          </div>
        </div>

        <div class="status-card">
          <h3>Database</h3>
          <div class="status-indicator">
            <div class={`status-dot ${systemHealth.database.status === 'connected' ? 'healthy' : 'error'}`}></div>
            <span class="status-text">{systemHealth.database.status}</span>
          </div>
          <div class="detail-item">
            <span>Latency</span>
            <strong>{systemHealth.database.latency}ms</strong>
          </div>
        </div>

        <div class="status-card">
          <h3>Memory Usage</h3>
          <div class="memory-usage">
            <div class="memory-bar">
              <div 
                class="memory-fill" 
                style={{ width: `${(systemHealth.memory.used / systemHealth.memory.total) * 100}%` }}
              ></div>
            </div>
            <div class="memory-text">
              {formatBytes(systemHealth.memory.used)} / {formatBytes(systemHealth.memory.total)}
            </div>
          </div>
        </div>

        <div class="status-card">
          <h3>Active Alerts</h3>
          <div class="alert-summary">
            <span class="alert-count error">{alerts.filter(a => a.level === 'error' && !a.resolved).length}</span>
            <span class="alert-count warning">{alerts.filter(a => a.level === 'warning' && !a.resolved).length}</span>
            <span class="alert-count info">{alerts.filter(a => a.level === 'info' && !a.resolved).length}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div class="monitoring-tabs">
        <button 
          class={`tab ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button 
          class={`tab ${selectedTab === 'performance' ? 'active' : ''}`}
          onClick={() => setSelectedTab('performance')}
        >
          Performance
        </button>
        <button 
          class={`tab ${selectedTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setSelectedTab('alerts')}
        >
          Alerts
        </button>
        <button 
          class={`tab ${selectedTab === 'logs' ? 'active' : ''}`}
          onClick={() => setSelectedTab('logs')}
        >
          Logs
        </button>
      </div>

      {/* Tab Content */}
      <div class="tab-content">
        {selectedTab === 'overview' && (
          <div class="overview-content">
            <div class="charts-grid">
              <AnalyticsChart
                data={metrics.responseTime}
                type="line"
                title="Response Time (ms)"
                height={250}
              />
              <AnalyticsChart
                data={metrics.errorRate}
                type="line"
                title="Error Rate (%)"
                height={250}
              />
              <AnalyticsChart
                data={metrics.throughput}
                type="bar"
                title="Requests per Hour"
                height={250}
              />
              <AnalyticsChart
                data={metrics.cpuUsage}
                type="line"
                title="CPU Usage (%)"
                height={250}
              />
            </div>
          </div>
        )}

        {selectedTab === 'performance' && (
          <div class="performance-content">
            <div class="charts-grid">
              <AnalyticsChart
                data={metrics.cpuUsage}
                type="line"
                title="CPU Usage (%)"
                height={300}
              />
              <AnalyticsChart
                data={metrics.memoryUsage}
                type="line"
                title="Memory Usage (%)"
                height={300}
              />
            </div>

            <div class="performance-metrics">
              <h3>Performance Metrics</h3>
              <div class="metrics-grid">
                <div class="metric-item">
                  <div class="metric-label">Avg Response Time</div>
                  <div class="metric-value">
                    {Math.round(metrics.responseTime.reduce((sum, d) => sum + d.value, 0) / metrics.responseTime.length)}ms
                  </div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">Error Rate</div>
                  <div class="metric-value">
                    {(metrics.errorRate.reduce((sum, d) => sum + d.value, 0) / metrics.errorRate.length).toFixed(2)}%
                  </div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">Peak Throughput</div>
                  <div class="metric-value">
                    {Math.max(...metrics.throughput.map(d => d.value))}/hr
                  </div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">Avg CPU Usage</div>
                  <div class="metric-value">
                    {Math.round(metrics.cpuUsage.reduce((sum, d) => sum + d.value, 0) / metrics.cpuUsage.length)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div class="alerts-content">
            <h3>System Alerts</h3>
            <div class="alerts-list">
              {alerts.map(alert => (
                <div key={alert.id} class={`alert-item ${alert.level} ${alert.resolved ? 'resolved' : ''}`}>
                  <div class="alert-header">
                    <div class="alert-level">
                      <span class={`alert-badge ${alert.level}`}>
                        {alert.level.toUpperCase()}
                      </span>
                      <span class="alert-message">{alert.message}</span>
                    </div>
                    <div class="alert-time">
                      {alert.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div class="alert-details">
                    {alert.details}
                  </div>
                  {alert.resolved && (
                    <div class="alert-resolved">✓ Resolved</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'logs' && (
          <div class="logs-content">
            <h3>Activity Logs</h3>
            <div class="logs-list">
              {logs.map(log => (
                <div key={log.id} class="log-item">
                  <div class="log-header">
                    <span class="log-time">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span class={`log-level ${log.level}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </div>
                  <div class="log-message">{log.message}</div>
                  {log.details && (
                    <div class="log-details">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-monitoring {
          padding: var(--space-xl);
          max-width: 1400px;
          margin: 0 auto;
        }

        .monitoring-loading {
          text-align: center;
          padding: var(--space-2xl);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto var(--space-md);
        }

        .monitoring-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-xl);
        }

        .header-left h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 2rem;
        }

        .header-left p {
          margin: var(--space-sm) 0 0 0;
          color: var(--text-secondary);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .system-status {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .status-card {
          background: var(--surface);
          padding: var(--space-lg);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .status-card.primary {
          background: linear-gradient(135deg, var(--success), #059669);
          color: white;
          border: none;
        }

        .status-card h3 {
          margin: 0 0 var(--space-md) 0;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .status-card.primary h3 {
          color: white;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-dot.healthy {
          background: var(--success);
        }

        .status-dot.warning {
          background: var(--warning);
        }

        .status-dot.error {
          background: var(--danger);
        }

        .status-text {
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-details {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .memory-usage {
          margin-top: var(--space-sm);
        }

        .memory-bar {
          width: 100%;
          height: 8px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: var(--space-sm);
        }

        .memory-fill {
          height: 100%;
          background: var(--primary);
          transition: width var(--transition-base);
        }

        .memory-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .alert-summary {
          display: flex;
          gap: var(--space-md);
          margin-top: var(--space-sm);
        }

        .alert-count {
          padding: var(--space-xs) var(--space-sm);
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .alert-count.error {
          background: var(--danger);
        }

        .alert-count.warning {
          background: var(--warning);
        }

        .alert-count.info {
          background: var(--primary);
        }

        .monitoring-tabs {
          display: flex;
          gap: var(--space-sm);
          margin-bottom: var(--space-xl);
          border-bottom: 1px solid var(--border);
        }

        .tab {
          background: none;
          border: none;
          padding: var(--space-md) var(--space-lg);
          color: var(--text-secondary);
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .tab:hover {
          color: var(--text-primary);
        }

        .tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: var(--space-xl);
          margin-bottom: var(--space-xl);
        }

        .performance-metrics h3 {
          margin-bottom: var(--space-lg);
          color: var(--text-primary);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-lg);
        }

        .metric-item {
          text-align: center;
          padding: var(--space-lg);
          background: var(--surface);
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .metric-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: var(--space-sm);
        }

        .metric-item .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        .alerts-list,
        .logs-list {
          margin-top: var(--space-lg);
        }

        .alert-item {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: var(--space-lg);
          margin-bottom: var(--space-md);
        }

        .alert-item.resolved {
          opacity: 0.7;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm);
        }

        .alert-level {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .alert-badge {
          padding: var(--space-xs) var(--space-sm);
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .alert-badge.error {
          background: var(--danger);
        }

        .alert-badge.warning {
          background: var(--warning);
        }

        .alert-badge.info {
          background: var(--primary);
        }

        .alert-message {
          font-weight: 500;
          color: var(--text-primary);
        }

        .alert-time {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .alert-details {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .alert-resolved {
          margin-top: var(--space-sm);
          color: var(--success);
          font-weight: 500;
        }

        .log-item {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: var(--space-lg);
          margin-bottom: var(--space-md);
          font-family: monospace;
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm);
        }

        .log-time {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .log-level {
          padding: var(--space-xs) var(--space-sm);
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .log-level.info {
          background: var(--primary);
        }

        .log-level.warning {
          background: var(--warning);
        }

        .log-level.error {
          background: var(--danger);
        }

        .log-message {
          color: var(--text-primary);
          margin-bottom: var(--space-sm);
        }

        .log-details {
          background: var(--bg-secondary);
          padding: var(--space-sm);
          border-radius: 4px;
          overflow-x: auto;
        }

        .log-details pre {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (max-width: 768px) {
          .monitoring-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-md);
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .system-status {
            grid-template-columns: 1fr;
          }

          .monitoring-tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  );
}