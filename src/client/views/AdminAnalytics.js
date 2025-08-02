import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { api } from '../services/api';
import { AnalyticsChart } from '../components/AnalyticsChart';

export function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [metrics, setMetrics] = useState({
    userGrowth: [],
    photoUploads: [],
    userActivity: [],
    topFeatures: [],
    deviceBreakdown: [],
    retentionCohorts: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Generate mock data for demonstration
      const userGrowthData = generateTimeSeriesData(timeRange, 'users');
      const photoUploadsData = generateTimeSeriesData(timeRange, 'photos');
      const userActivityData = generateTimeSeriesData(timeRange, 'activity');
      const topFeaturesData = [
        { label: 'Photo Upload', value: 85 },
        { label: 'Face Detection', value: 72 },
        { label: 'Share Links', value: 64 },
        { label: 'Albums', value: 45 },
        { label: 'Settings', value: 23 }
      ];
      const deviceBreakdownData = [
        { label: 'Mobile', value: 65 },
        { label: 'Desktop', value: 28 },
        { label: 'Tablet', value: 7 }
      ];

      setMetrics({
        userGrowth: userGrowthData,
        photoUploads: photoUploadsData,
        userActivity: userActivityData,
        topFeatures: topFeaturesData,
        deviceBreakdown: deviceBreakdownData,
        retentionCohorts: generateRetentionData()
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSeriesData = (range, type) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = [];
    const baseValue = type === 'users' ? 150 : type === 'photos' ? 500 : 80;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const randomVariation = Math.random() * 0.4 + 0.8; // 80-120% of base
      const trendMultiplier = 1 + (days - i) * 0.01; // Slight upward trend
      
      data.push({
        label: date,
        value: Math.round(baseValue * randomVariation * trendMultiplier)
      });
    }
    return data;
  };

  const generateRetentionData = () => {
    const cohorts = [];
    for (let i = 0; i < 6; i++) {
      const cohort = {
        month: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: Math.round(200 + Math.random() * 100),
        retention: [
          100, // Month 0
          Math.round(75 + Math.random() * 15), // Month 1
          Math.round(60 + Math.random() * 15), // Month 2
          Math.round(45 + Math.random() * 15), // Month 3
          Math.round(35 + Math.random() * 10), // Month 4
          Math.round(25 + Math.random() * 10), // Month 5
        ]
      };
      cohorts.push(cohort);
    }
    return cohorts;
  };

  const formatPercentage = (value) => `${value}%`;
  const formatNumber = (value) => value.toLocaleString();

  if (loading) {
    return (
      <div class="analytics-loading">
        <div class="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div class="admin-analytics">
      {/* Header */}
      <div class="analytics-header">
        <div class="header-left">
          <h1>Analytics Dashboard</h1>
          <p>Comprehensive platform insights and metrics</p>
        </div>
        <div class="header-right">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            class="time-range-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div class="analytics-tabs">
        <button 
          class={`tab ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button 
          class={`tab ${selectedTab === 'users' ? 'active' : ''}`}
          onClick={() => setSelectedTab('users')}
        >
          Users
        </button>
        <button 
          class={`tab ${selectedTab === 'content' ? 'active' : ''}`}
          onClick={() => setSelectedTab('content')}
        >
          Content
        </button>
        <button 
          class={`tab ${selectedTab === 'engagement' ? 'active' : ''}`}
          onClick={() => setSelectedTab('engagement')}
        >
          Engagement
        </button>
        <button 
          class={`tab ${selectedTab === 'retention' ? 'active' : ''}`}
          onClick={() => setSelectedTab('retention')}
        >
          Retention
        </button>
      </div>

      {/* Tab Content */}
      <div class="tab-content">
        {selectedTab === 'overview' && (
          <div class="overview-content">
            <div class="charts-grid">
              <AnalyticsChart
                data={metrics.userGrowth}
                type="line"
                title="User Growth"
                height={300}
              />
              <AnalyticsChart
                data={metrics.photoUploads}
                type="bar"
                title="Photo Uploads"
                height={300}
              />
              <AnalyticsChart
                data={metrics.deviceBreakdown}
                type="pie"
                title="Device Breakdown"
                height={300}
              />
              <AnalyticsChart
                data={metrics.topFeatures}
                type="bar"
                title="Feature Usage (%)"
                height={300}
              />
            </div>
          </div>
        )}

        {selectedTab === 'users' && (
          <div class="users-content">
            <div class="charts-grid">
              <AnalyticsChart
                data={metrics.userGrowth}
                type="line"
                title="New User Registrations"
                height={300}
              />
              <AnalyticsChart
                data={metrics.userActivity}
                type="line"
                title="Daily Active Users"
                height={300}
              />
            </div>

            <div class="metrics-cards">
              <div class="metric-card">
                <h3>Total Users</h3>
                <div class="metric-value">12,847</div>
                <div class="metric-change positive">+15.3% vs last period</div>
              </div>
              <div class="metric-card">
                <h3>Active Users (30d)</h3>
                <div class="metric-value">8,923</div>
                <div class="metric-change positive">+8.7% vs last period</div>
              </div>
              <div class="metric-card">
                <h3>Avg Session Duration</h3>
                <div class="metric-value">14m 32s</div>
                <div class="metric-change positive">+2.1% vs last period</div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'content' && (
          <div class="content-content">
            <div class="charts-grid">
              <AnalyticsChart
                data={metrics.photoUploads}
                type="bar"
                title="Daily Photo Uploads"
                height={300}
              />
              <div class="content-stats">
                <h3>Content Statistics</h3>
                <div class="stat-row">
                  <span>Total Photos</span>
                  <strong>1,245,678</strong>
                </div>
                <div class="stat-row">
                  <span>Total Storage Used</span>
                  <strong>3.2 TB</strong>
                </div>
                <div class="stat-row">
                  <span>Avg Photos per User</span>
                  <strong>97</strong>
                </div>
                <div class="stat-row">
                  <span>Faces Detected</span>
                  <strong>2,847,392</strong>
                </div>
                <div class="stat-row">
                  <span>Share Links Created</span>
                  <strong>156,789</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'engagement' && (
          <div class="engagement-content">
            <div class="charts-grid">
              <AnalyticsChart
                data={metrics.topFeatures}
                type="bar"
                title="Feature Usage Rate"
                height={300}
              />
              <AnalyticsChart
                data={metrics.deviceBreakdown}
                type="pie"
                title="Platform Usage"
                height={300}
              />
            </div>

            <div class="engagement-metrics">
              <h3>Engagement Metrics</h3>
              <div class="metric-grid">
                <div class="metric-item">
                  <div class="metric-label">Photos per Session</div>
                  <div class="metric-value">4.7</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">Shares per User</div>
                  <div class="metric-value">12.3</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">Face Detection Usage</div>
                  <div class="metric-value">72%</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">Album Creation Rate</div>
                  <div class="metric-value">3.2/user</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'retention' && (
          <div class="retention-content">
            <h3>User Retention Cohorts</h3>
            <div class="cohort-table">
              <table>
                <thead>
                  <tr>
                    <th>Cohort</th>
                    <th>Users</th>
                    <th>Month 0</th>
                    <th>Month 1</th>
                    <th>Month 2</th>
                    <th>Month 3</th>
                    <th>Month 4</th>
                    <th>Month 5</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.retentionCohorts.map((cohort, index) => (
                    <tr key={index}>
                      <td>{cohort.month}</td>
                      <td>{cohort.users}</td>
                      {cohort.retention.map((rate, i) => (
                        <td key={i} class={`retention-cell ${rate > 50 ? 'good' : rate > 30 ? 'medium' : 'poor'}`}>
                          {rate}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-analytics {
          padding: var(--space-xl);
          max-width: 1400px;
          margin: 0 auto;
        }

        .analytics-loading {
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

        .analytics-header {
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

        .time-range-select {
          padding: var(--space-sm) var(--space-md);
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-primary);
        }

        .analytics-tabs {
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

        .metrics-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-lg);
          margin-top: var(--space-xl);
        }

        .metric-card {
          background: var(--surface);
          padding: var(--space-lg);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .metric-card h3 {
          margin: 0 0 var(--space-sm) 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-sm);
        }

        .metric-change {
          font-size: 0.875rem;
        }

        .metric-change.positive {
          color: var(--success);
        }

        .metric-change.negative {
          color: var(--danger);
        }

        .content-stats {
          background: var(--surface);
          padding: var(--space-xl);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .content-stats h3 {
          margin: 0 0 var(--space-lg) 0;
          color: var(--text-primary);
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) 0;
          border-bottom: 1px solid var(--border);
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .engagement-metrics {
          margin-top: var(--space-xl);
        }

        .engagement-metrics h3 {
          margin-bottom: var(--space-lg);
          color: var(--text-primary);
        }

        .metric-grid {
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
          margin: 0;
        }

        .cohort-table {
          overflow-x: auto;
          margin-top: var(--space-lg);
        }

        .cohort-table table {
          width: 100%;
          border-collapse: collapse;
          background: var(--surface);
          border-radius: 8px;
          overflow: hidden;
        }

        .cohort-table th,
        .cohort-table td {
          padding: var(--space-md);
          text-align: center;
          border-bottom: 1px solid var(--border);
        }

        .cohort-table th {
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-weight: 600;
        }

        .retention-cell.good {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .retention-cell.medium {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }

        .retention-cell.poor {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .analytics-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-md);
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .analytics-tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  );
}