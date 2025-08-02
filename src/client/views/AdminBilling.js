import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { api } from '../services/api';
import { AnalyticsChart } from '../components/AnalyticsChart';

export function AdminBilling() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [billingData, setBillingData] = useState({
    revenue: {
      mrr: 45789,
      arr: 549468,
      growth: 12.5,
      churn: 3.2
    },
    subscriptions: {
      total: 4567,
      active: 4321,
      trialing: 123,
      pastDue: 89,
      canceled: 34
    },
    metrics: {
      arpu: 10.59,
      ltv: 387.50,
      cac: 23.45,
      paybackPeriod: 2.2
    }
  });
  const [revenueChart, setRevenueChart] = useState([]);
  const [subscriptionChart, setSubscriptionChart] = useState([]);
  const [churnChart, setChurnChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, [dateRange]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Generate mock data for demonstration
      setRevenueChart(generateRevenueData(dateRange));
      setSubscriptionChart(generateSubscriptionData(dateRange));
      setChurnChart(generateChurnData(dateRange));
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRevenueData = (range) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = [];
    const baseRevenue = 1500;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const seasonality = Math.sin((date.getDate() / 30) * Math.PI) * 0.2 + 1;
      const growth = 1 + (days - i) * 0.005; // 0.5% daily growth
      const randomVariation = Math.random() * 0.3 + 0.85;
      
      data.push({
        label: date,
        value: Math.round(baseRevenue * seasonality * growth * randomVariation)
      });
    }
    return data;
  };

  const generateSubscriptionData = (range) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = [];
    const baseSubscriptions = 50;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const weekendFactor = [0, 6].includes(date.getDay()) ? 0.7 : 1;
      const growth = 1 + (days - i) * 0.01;
      const randomVariation = Math.random() * 0.4 + 0.8;
      
      data.push({
        label: date,
        value: Math.round(baseSubscriptions * weekendFactor * growth * randomVariation)
      });
    }
    return data;
  };

  const generateChurnData = (range) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const churnRate = Math.random() * 2 + 1; // 1-3% churn rate
      
      data.push({
        label: date,
        value: Math.round(churnRate * 10) / 10 // Round to 1 decimal
      });
    }
    return data;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => `${value}%`;

  const subscriptionPlans = [
    { name: 'Free', price: 0, users: 2145, percentage: 47 },
    { name: 'Basic', price: 4.99, users: 1876, percentage: 41 },
    { name: 'Pro', price: 9.99, users: 456, percentage: 10 },
    { name: 'Enterprise', price: 29.99, users: 90, percentage: 2 }
  ];

  const recentTransactions = [
    { id: 'txn_001', user: 'john@example.com', amount: 9.99, plan: 'Pro', status: 'success', date: new Date() },
    { id: 'txn_002', user: 'sarah@example.com', amount: 4.99, plan: 'Basic', status: 'success', date: new Date(Date.now() - 3600000) },
    { id: 'txn_003', user: 'mike@example.com', amount: 29.99, plan: 'Enterprise', status: 'failed', date: new Date(Date.now() - 7200000) },
    { id: 'txn_004', user: 'lisa@example.com', amount: 9.99, plan: 'Pro', status: 'success', date: new Date(Date.now() - 10800000) },
    { id: 'txn_005', user: 'tom@example.com', amount: 4.99, plan: 'Basic', status: 'pending', date: new Date(Date.now() - 14400000) }
  ];

  if (loading) {
    return (
      <div class="billing-loading">
        <div class="loading-spinner"></div>
        <p>Loading billing data...</p>
      </div>
    );
  }

  return (
    <div class="admin-billing">
      {/* Header */}
      <div class="billing-header">
        <div class="header-left">
          <h1>Billing & Revenue</h1>
          <p>Monitor subscription metrics and financial performance</p>
        </div>
        <div class="header-right">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            class="date-range-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div class="revenue-metrics">
        <div class="metric-card primary">
          <div class="metric-header">
            <h3>Monthly Recurring Revenue</h3>
            <span class="metric-icon">💰</span>
          </div>
          <div class="metric-value">{formatCurrency(billingData.revenue.mrr)}</div>
          <div class="metric-change positive">+{billingData.revenue.growth}% vs last month</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h3>Annual Recurring Revenue</h3>
            <span class="metric-icon">📈</span>
          </div>
          <div class="metric-value">{formatCurrency(billingData.revenue.arr)}</div>
          <div class="metric-subtitle">Based on current MRR</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h3>Active Subscriptions</h3>
            <span class="metric-icon">👥</span>
          </div>
          <div class="metric-value">{billingData.subscriptions.active.toLocaleString()}</div>
          <div class="metric-subtitle">of {billingData.subscriptions.total.toLocaleString()} total</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h3>Churn Rate</h3>
            <span class="metric-icon">📉</span>
          </div>
          <div class="metric-value">{formatPercentage(billingData.revenue.churn)}</div>
          <div class="metric-change negative">+0.3% vs last month</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div class="billing-tabs">
        <button 
          class={`tab ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button 
          class={`tab ${selectedTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setSelectedTab('subscriptions')}
        >
          Subscriptions
        </button>
        <button 
          class={`tab ${selectedTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setSelectedTab('transactions')}
        >
          Transactions
        </button>
        <button 
          class={`tab ${selectedTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setSelectedTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div class="tab-content">
        {selectedTab === 'overview' && (
          <div class="overview-content">
            <div class="charts-grid">
              <AnalyticsChart
                data={revenueChart}
                type="line"
                title="Daily Revenue"
                height={300}
              />
              <AnalyticsChart
                data={subscriptionChart}
                type="bar"
                title="New Subscriptions"
                height={300}
              />
            </div>

            <div class="key-metrics-grid">
              <div class="metrics-card">
                <h3>Financial Metrics</h3>
                <div class="metrics-list">
                  <div class="metric-row">
                    <span>Average Revenue Per User (ARPU)</span>
                    <strong>{formatCurrency(billingData.metrics.arpu)}</strong>
                  </div>
                  <div class="metric-row">
                    <span>Customer Lifetime Value (LTV)</span>
                    <strong>{formatCurrency(billingData.metrics.ltv)}</strong>
                  </div>
                  <div class="metric-row">
                    <span>Customer Acquisition Cost (CAC)</span>
                    <strong>{formatCurrency(billingData.metrics.cac)}</strong>
                  </div>
                  <div class="metric-row">
                    <span>Payback Period</span>
                    <strong>{billingData.metrics.paybackPeriod} months</strong>
                  </div>
                  <div class="metric-row">
                    <span>LTV:CAC Ratio</span>
                    <strong>{Math.round(billingData.metrics.ltv / billingData.metrics.cac * 10) / 10}:1</strong>
                  </div>
                </div>
              </div>

              <div class="subscription-breakdown">
                <h3>Subscription Breakdown</h3>
                {subscriptionPlans.map(plan => (
                  <div key={plan.name} class="plan-row">
                    <div class="plan-info">
                      <span class="plan-name">{plan.name}</span>
                      <span class="plan-price">{formatCurrency(plan.price)}/mo</span>
                    </div>
                    <div class="plan-stats">
                      <span class="plan-users">{plan.users.toLocaleString()}</span>
                      <div class="plan-bar">
                        <div class="plan-fill" style={{ width: `${plan.percentage}%` }}></div>
                      </div>
                      <span class="plan-percentage">{plan.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'subscriptions' && (
          <div class="subscriptions-content">
            <div class="subscription-stats">
              <div class="stat-card">
                <div class="stat-value">{billingData.subscriptions.active.toLocaleString()}</div>
                <div class="stat-label">Active</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{billingData.subscriptions.trialing.toLocaleString()}</div>
                <div class="stat-label">Trialing</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{billingData.subscriptions.pastDue.toLocaleString()}</div>
                <div class="stat-label">Past Due</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{billingData.subscriptions.canceled.toLocaleString()}</div>
                <div class="stat-label">Canceled</div>
              </div>
            </div>

            <AnalyticsChart
              data={subscriptionChart}
              type="line"
              title="Subscription Growth"
              height={300}
            />
          </div>
        )}

        {selectedTab === 'transactions' && (
          <div class="transactions-content">
            <h3>Recent Transactions</h3>
            <div class="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(txn => (
                    <tr key={txn.id}>
                      <td class="txn-id">{txn.id}</td>
                      <td class="txn-user">{txn.user}</td>
                      <td class="txn-plan">{txn.plan}</td>
                      <td class="txn-amount">{formatCurrency(txn.amount)}</td>
                      <td class="txn-status">
                        <span class={`status-badge ${txn.status}`}>
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </span>
                      </td>
                      <td class="txn-date">
                        {txn.date.toLocaleDateString()} {txn.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'analytics' && (
          <div class="analytics-content">
            <div class="charts-grid">
              <AnalyticsChart
                data={churnChart}
                type="line"
                title="Churn Rate (%)"
                height={300}
              />
              <AnalyticsChart
                data={revenueChart}
                type="bar"
                title="Revenue Trend"
                height={300}
              />
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-billing {
          padding: var(--space-xl);
          max-width: 1400px;
          margin: 0 auto;
        }

        .billing-loading {
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

        .billing-header {
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

        .date-range-select {
          padding: var(--space-sm) var(--space-md);
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-primary);
        }

        .revenue-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .metric-card {
          background: var(--surface);
          padding: var(--space-xl);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .metric-card.primary {
          background: linear-gradient(135deg, var(--primary), #1d4ed8);
          color: white;
          border: none;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }

        .metric-header h3 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.8;
        }

        .metric-icon {
          font-size: 1.5rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
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

        .metric-card.primary .metric-change.positive {
          color: #86efac;
        }

        .metric-subtitle {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .billing-tabs {
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

        .key-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-xl);
        }

        .metrics-card {
          background: var(--surface);
          padding: var(--space-xl);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .metrics-card h3 {
          margin: 0 0 var(--space-lg) 0;
          color: var(--text-primary);
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) 0;
          border-bottom: 1px solid var(--border);
        }

        .metric-row:last-child {
          border-bottom: none;
        }

        .subscription-breakdown h3 {
          margin: 0 0 var(--space-lg) 0;
          color: var(--text-primary);
        }

        .plan-row {
          margin-bottom: var(--space-lg);
        }

        .plan-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-sm);
        }

        .plan-name {
          font-weight: 500;
          color: var(--text-primary);
        }

        .plan-price {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .plan-stats {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .plan-users {
          font-size: 0.875rem;
          color: var(--text-secondary);
          min-width: 60px;
        }

        .plan-bar {
          flex: 1;
          height: 8px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
        }

        .plan-fill {
          height: 100%;
          background: var(--primary);
          transition: width var(--transition-base);
        }

        .plan-percentage {
          font-size: 0.875rem;
          color: var(--text-secondary);
          min-width: 40px;
          text-align: right;
        }

        .subscription-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .stat-card {
          background: var(--surface);
          padding: var(--space-lg);
          border-radius: 12px;
          border: 1px solid var(--border);
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: var(--space-sm);
        }

        .stat-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .transactions-table {
          background: var(--surface);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          margin-top: var(--space-lg);
        }

        .transactions-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .transactions-table th {
          background: var(--bg-secondary);
          padding: var(--space-md);
          text-align: left;
          font-weight: 600;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border);
        }

        .transactions-table td {
          padding: var(--space-md);
          border-bottom: 1px solid var(--border);
        }

        .txn-id {
          font-family: monospace;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .status-badge {
          padding: var(--space-xs) var(--space-sm);
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .status-badge.failed {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }

        .status-badge.pending {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .billing-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-md);
          }

          .charts-grid,
          .key-metrics-grid {
            grid-template-columns: 1fr;
          }

          .billing-tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .transactions-table {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}