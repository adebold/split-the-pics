import { h } from 'preact';
import { useState } from 'preact/hooks';
import { api } from '../services/api';
import { BackgroundImage } from '../components/BackgroundImage';
import { showNotification } from '../App';

export function AdminLoginPage({ navigate }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await api.request('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      // Store admin tokens
      localStorage.setItem('adminAccessToken', response.accessToken);
      localStorage.setItem('adminRefreshToken', response.refreshToken);
      
      api.adminToken = response.accessToken;
      api.adminRefreshToken = response.refreshToken;

      showNotification('Admin login successful', 'success');
      
      // Redirect to admin dashboard
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1000);
    } catch (error) {
      if (error.message.includes('Unauthorized')) {
        setErrors({ 
          email: 'Invalid admin credentials',
          password: 'Invalid admin credentials'
        });
      } else {
        showNotification(error.message || 'Login failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="auth-page with-background admin-login">
      <BackgroundImage theme="login" blur={true} overlay={true} />
      <div class="auth-container">
        <div class="auth-header">
          <div class="admin-badge">
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="var(--primary)" />
            </svg>
          </div>
          <h1>Admin Portal</h1>
          <p>SecureSnap Administration Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} class="auth-form">
          <div class="form-group">
            <label for="email">Admin Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="admin@securesnap.com"
              required
              disabled={loading}
            />
            {errors.email && <span class="error-text">{errors.email}</span>}
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Admin password"
              required
              disabled={loading}
            />
            {errors.password && <span class="error-text">{errors.password}</span>}
          </div>

          <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Authenticating...' : 'Access Admin Portal'}
          </button>
        </form>

        <div class="auth-footer">
          <p>
            <a href="/" class="link">← Back to Main Site</a>
          </p>
        </div>

        <div class="admin-warning">
          <p>⚠️ Authorized personnel only. All access is logged and monitored.</p>
        </div>
      </div>

      <style jsx>{`
        .admin-login .auth-container {
          border: 2px solid var(--primary);
          background: rgba(0, 0, 0, 0.9);
        }

        .admin-badge {
          display: inline-flex;
          margin-bottom: var(--space-md);
          padding: var(--space-sm);
          background: rgba(var(--primary-rgb), 0.2);
          border-radius: 50%;
        }

        .admin-warning {
          margin-top: var(--space-lg);
          padding: var(--space-md);
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          border-radius: 8px;
          text-align: center;
        }

        .admin-warning p {
          margin: 0;
          color: #ffc107;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}