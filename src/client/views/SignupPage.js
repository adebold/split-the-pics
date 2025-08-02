import { h } from 'preact';
import { useState } from 'preact/hooks';
import { api } from '../services/api';
import { BackgroundImage } from '../components/BackgroundImage';
import { showNotification } from '../App';

export function SignupPage({ navigate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      // Store tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Update API client
      api.token = response.accessToken;
      api.refreshToken = response.refreshToken;

      showNotification('Account created successfully!', 'success');
      
      // Redirect to photos page
      setTimeout(() => {
        window.location.href = '/photos';
      }, 1000);
    } catch (error) {
      if (error.message.includes('already exists')) {
        setErrors({ email: 'An account with this email already exists' });
      } else {
        showNotification(error.message || 'Registration failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="auth-page with-background">
      <BackgroundImage theme="signup" blur={true} overlay={true} />
      <div class="auth-container">
        <div class="auth-header">
          <h1>Create Account</h1>
          <p>Join SecureSnap to start sharing photos securely</p>
        </div>

        <form onSubmit={handleSubmit} class="auth-form">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              required
              disabled={loading}
            />
            {errors.name && <span class="error-text">{errors.name}</span>}
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
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
              placeholder="At least 8 characters"
              required
              disabled={loading}
            />
            {errors.password && <span class="error-text">{errors.password}</span>}
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter your password"
              required
              disabled={loading}
            />
            {errors.confirmPassword && <span class="error-text">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div class="auth-footer">
          <p>
            Already have an account?{' '}
            <a href="/login" class="link">Log in</a>
          </p>
        </div>

        <div class="auth-features">
          <h3>Why SecureSnap?</h3>
          <ul>
            <li>🔒 End-to-end encryption</li>
            <li>🤖 AI-powered face detection</li>
            <li>🔗 Secure time-limited sharing</li>
            <li>📱 Works on all devices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}