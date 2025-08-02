import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageQuota, setStorageQuota] = useState(0);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
      setTwoFactorEnabled(user.twoFactorEnabled || false);
      loadStorageInfo();
    }
  }, [user]);

  const loadStorageInfo = async () => {
    try {
      const response = await api.get('/api/user/storage');
      setStorageUsed(response.data.used);
      setStorageQuota(response.data.quota);
    } catch (err) {
      console.error('Failed to load storage info:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updates = {
        name: formData.name,
        email: formData.email
      };

      if (formData.currentPassword && formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        updates.currentPassword = formData.currentPassword;
        updates.newPassword = formData.newPassword;
      }

      const response = await api.put('/api/user/profile', updates);
      updateUser(response.data.user);
      setSuccess('Profile updated successfully');
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setLoading(true);
    setError(null);

    try {
      if (twoFactorEnabled) {
        await api.post('/api/auth/2fa/disable');
        setTwoFactorEnabled(false);
        setSuccess('Two-factor authentication disabled');
      } else {
        // This would typically open a modal to setup 2FA
        const response = await api.post('/api/auth/2fa/enable');
        // Handle QR code display for 2FA setup
        console.log('2FA setup:', response.data);
        setTwoFactorEnabled(true);
        setSuccess('Two-factor authentication enabled');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div class="settings-page">
        <div class="login-prompt">
          <h2>Please log in to access settings</h2>
          <a href="/login" class="btn btn-primary">Log In</a>
        </div>
      </div>
    );
  }

  const storagePercentage = storageQuota > 0 ? (storageUsed / storageQuota) * 100 : 0;

  return (
    <div class="settings-page">
      <div class="page-header">
        <h1>Settings</h1>
      </div>

      <div class="settings-container">
        {error && (
          <div class="alert alert-error">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div class="alert alert-success">
            <p>{success}</p>
          </div>
        )}

        <section class="settings-section">
          <h2>Profile Information</h2>
          <form onSubmit={handleUpdateProfile}>
            <div class="form-group">
              <label for="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <h3>Change Password</h3>
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <button type="submit" class="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </section>

        <section class="settings-section">
          <h2>Security</h2>
          <div class="security-setting">
            <div class="setting-info">
              <h3>Two-Factor Authentication</h3>
              <p>Add an extra layer of security to your account</p>
            </div>
            <button
              class={`btn ${twoFactorEnabled ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleToggle2FA}
              disabled={loading}
            >
              {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </section>

        <section class="settings-section">
          <h2>Storage</h2>
          <div class="storage-info">
            <div class="storage-stats">
              <p>
                {(storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB of{' '}
                {(storageQuota / 1024 / 1024 / 1024).toFixed(2)} GB used
              </p>
            </div>
            <div class="storage-bar">
              <div 
                class="storage-fill" 
                style={`width: ${storagePercentage}%`}
              ></div>
            </div>
            <p class="storage-percentage">{storagePercentage.toFixed(1)}% used</p>
          </div>
        </section>

        <section class="settings-section danger-zone">
          <h2>Danger Zone</h2>
          <div class="danger-actions">
            <button class="btn btn-danger">
              Delete Account
            </button>
            <p class="danger-warning">
              This action cannot be undone. All your photos and data will be permanently deleted.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}