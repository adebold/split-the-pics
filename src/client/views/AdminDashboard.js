import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { api } from '../services/api';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminUsers } from './AdminUsers';
import { AdminBilling } from './AdminBilling';
import { AdminMonitoring } from './AdminMonitoring';

export function AdminDashboard({ navigate }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState({
    users: { total: 0, active: 0, new: 0 },
    photos: { total: 0, uploads: 0, shares: 0 },
    storage: { used: 0, total: 0 },
    revenue: { mrr: 0, arr: 0, growth: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await api.request('/admin/stats/dashboard');
      setStats(response);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    navigate('/admin/login');
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div class="admin-dashboard">
      {/* Header */}
      <header class="admin-header">
        <div class="header-content">
          <div class="header-left">
            <h1>SecureSnap Admin</h1>
            <span class="header-subtitle">Platform Management Dashboard</span>
          </div>
          <div class="header-right">
            <button class="btn btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav class="admin-nav">
        <div class="nav-content">
          <button 
            class={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button 
            class={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button 
            class={`nav-tab ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            💳 Billing
          </button>
          <button 
            class={`nav-tab ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            🔧 Monitoring
          </button>
          <button 
            class={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main class="admin-main">
        {loading ? (
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <section class="metrics-grid">
              <div class="metric-card">
                <div class="metric-header">
                  <h3>Total Users</h3>
                  <span class="metric-icon">👥</span>
                </div>
                <div class="metric-value">{stats.users.total.toLocaleString()}</div>
                <div class="metric-subtitle">
                  +{stats.users.new} new this month
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-header">
                  <h3>Active Users</h3>
                  <span class="metric-icon">⚡</span>
                </div>
                <div class="metric-value">{stats.users.active.toLocaleString()}</div>
                <div class="metric-subtitle">
                  {Math.round((stats.users.active / stats.users.total) * 100)}% of total
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-header">
                  <h3>Photos Stored</h3>
                  <span class="metric-icon">📸</span>
                </div>
                <div class="metric-value">{stats.photos.total.toLocaleString()}</div>
                <div class="metric-subtitle">
                  {formatBytes(stats.storage.used)} used
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-header">
                  <h3>Monthly Revenue</h3>
                  <span class="metric-icon">💰</span>
                </div>
                <div class="metric-value">{formatCurrency(stats.revenue.mrr)}</div>
                <div class="metric-subtitle">
                  {stats.revenue.growth > 0 ? '+' : ''}{stats.revenue.growth}% growth
                </div>
              </div>
            </section>

            {/* Tab Content */}
            <section class="tab-content">
              {activeTab === 'analytics' && (
                <AdminAnalytics />
              )}

              {activeTab === 'users' && (
                <AdminUsers />
              )}

              {activeTab === 'billing' && (
                <AdminBilling />
              )}

              {activeTab === 'monitoring' && (
                <AdminMonitoring />
              )}

              {activeTab === 'settings' && (
                <div class="settings-content">
                  <h2>Platform Settings</h2>
                  <div class="coming-soon">
                    <p>⚙️ Settings panel coming soon...</p>
                    <p>Will include feature flags, configuration, and admin tools.</p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <style jsx>{`
        .admin-dashboard {
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .admin-header {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: var(--space-md) var(--space-lg);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.5rem;
        }

        .header-subtitle {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .admin-nav {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0 var(--space-lg);
        }

        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          gap: var(--space-sm);
        }

        .nav-tab {
          background: none;
          border: none;
          padding: var(--space-md) var(--space-lg);
          color: var(--text-secondary);
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .nav-tab:hover {
          color: var(--text-primary);
          background: rgba(var(--primary-rgb), 0.1);
        }

        .nav-tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .admin-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: var(--space-xl) var(--space-lg);
        }

        .loading-container {
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

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-2xl);
        }

        .metric-card {
          background: var(--surface);
          padding: var(--space-xl);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }

        .metric-header h3 {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-icon {
          font-size: 1.5rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-sm);
        }

        .metric-subtitle {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .tab-content {
          background: var(--surface);
          border-radius: 12px;
          padding: var(--space-xl);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
        }

        .tab-content h2 {
          margin: 0 0 var(--space-lg) 0;
          color: var(--text-primary);
        }

        .coming-soon {
          text-align: center;
          padding: var(--space-2xl);
          color: var(--text-secondary);
        }

        .coming-soon p {
          margin: var(--space-md) 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .nav-content {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .admin-main {
            padding: var(--space-lg) var(--space-md);
          }
        }
      `}</style>
    </div>
  );
}