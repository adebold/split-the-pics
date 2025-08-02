import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useAuth } from '../contexts/AuthContext';
import { qrAuth } from '../services/qrAuth';
import { timeLimitedLinks } from '../services/timeLimitedLinks';
import { TwoFactorLogin } from '../components/TwoFactorLogin';
import { showNotification } from '../App';

export function LoginPage({ navigate }) {
  const { login } = useAuth();
  const [loginMethod, setLoginMethod] = useState('email'); // email, qr, magic
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    return () => {
      // Cleanup QR polling on unmount
      qrAuth.stopPolling();
    };
  }, []);

  // Email/Password login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.requires2FA) {
        setRequires2FA(true);
        setSessionToken(result.sessionToken);
      } else {
        navigate('/photos');
      }
    } catch (error) {
      showNotification(error.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // QR Code login
  const initQRLogin = async () => {
    setLoading(true);
    
    try {
      const data = await qrAuth.generateLoginQR();
      setQrData(data);
      
      // Start polling for authentication
      qrAuth.startPolling(
        data.sessionId,
        (response) => {
          showNotification('Login successful!', 'success');
          navigate('/photos');
        },
        (error) => {
          showNotification(error.message, 'error');
          setQrData(null);
        }
      );
    } catch (error) {
      showNotification('Failed to generate QR code', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Magic link login
  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) {
      showNotification('Please enter your email', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await timeLimitedLinks.createMagicLink(email);
      showNotification(result.message, 'success');
      
      // Show success message
      setLoginMethod('magic-sent');
    } catch (error) {
      showNotification(error.message || 'Failed to send magic link', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle 2FA success
  const handle2FASuccess = () => {
    navigate('/photos');
  };

  if (requires2FA) {
    return (
      <TwoFactorLogin
        sessionToken={sessionToken}
        onSuccess={handle2FASuccess}
        onCancel={() => {
          setRequires2FA(false);
          setSessionToken(null);
        }}
      />
    );
  }

  return (
    <div class="login-page">
      <div class="login-container">
        <div class="login-header">
          <h1>Welcome to SecureSnap</h1>
          <p>Choose your preferred login method</p>
        </div>

        <div class="login-methods">
          <button
            class={`method-tab ${loginMethod === 'email' ? 'active' : ''}`}
            onClick={() => setLoginMethod('email')}
          >
            Email
          </button>
          <button
            class={`method-tab ${loginMethod === 'qr' ? 'active' : ''}`}
            onClick={() => setLoginMethod('qr')}
          >
            QR Code
          </button>
          <button
            class={`method-tab ${loginMethod === 'magic' ? 'active' : ''}`}
            onClick={() => setLoginMethod('magic')}
          >
            Magic Link
          </button>
        </div>

        {loginMethod === 'email' && (
          <form class="login-form" onSubmit={handleEmailLogin}>
            <div class="input-group">
              <label class="label" for="email">Email</label>
              <input
                type="email"
                id="email"
                class="input"
                placeholder="you@example.com"
                value={email}
                onInput={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div class="input-group">
              <label class="label" for="password">Password</label>
              <input
                type="password"
                id="password"
                class="input"
                placeholder="••••••••"
                value={password}
                onInput={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div class="login-links">
              <a href="/forgot-password" class="link">Forgot password?</a>
              <a href="/signup" class="link">Create account</a>
            </div>
          </form>
        )}

        {loginMethod === 'qr' && (
          <div class="qr-login">
            {!qrData ? (
              <button
                class="btn btn-primary btn-full"
                onClick={initQRLogin}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate QR Code'}
              </button>
            ) : (
              <div class="qr-container">
                <img src={qrData.qrCode} alt="Login QR Code" class="qr-code" />
                <p class="qr-instructions">
                  Scan this QR code with your mobile device to login
                </p>
                <div class="qr-expire-notice">
                  Expires in 5 minutes
                </div>
                <button
                  class="btn btn-secondary"
                  onClick={() => {
                    qrAuth.stopPolling();
                    setQrData(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {loginMethod === 'magic' && (
          <form class="magic-link-form" onSubmit={handleMagicLink}>
            <div class="input-group">
              <label class="label" for="magic-email">Email</label>
              <input
                type="email"
                id="magic-email"
                class="input"
                placeholder="you@example.com"
                value={email}
                onInput={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>

            <p class="magic-info">
              We'll send you a secure link to sign in without a password.
            </p>
          </form>
        )}

        {loginMethod === 'magic-sent' && (
          <div class="magic-sent">
            <div class="success-icon">
              <svg viewBox="0 0 24 24" width="64" height="64">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="var(--success)" />
              </svg>
            </div>
            <h2>Check Your Email</h2>
            <p>We've sent a magic link to <strong>{email}</strong></p>
            <p class="magic-expire">The link will expire in 15 minutes</p>
            
            <button
              class="btn btn-secondary"
              onClick={() => setLoginMethod('magic')}
            >
              Try Another Email
            </button>
          </div>
        )}

        <div class="login-footer">
          <p class="security-notice">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="var(--success)" />
            </svg>
            Your data is encrypted and secure
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md);
          background: var(--bg-secondary);
        }

        .login-container {
          width: 100%;
          max-width: 400px;
          background: var(--surface);
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        .login-header {
          padding: var(--space-xl) var(--space-xl) var(--space-lg);
          text-align: center;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
        }

        .login-header h1 {
          margin: 0 0 var(--space-sm);
          font-size: 1.75rem;
        }

        .login-header p {
          margin: 0;
          opacity: 0.9;
        }

        .login-methods {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .method-tab {
          flex: 1;
          padding: var(--space-md);
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
        }

        .method-tab.active {
          color: var(--primary);
          background: var(--surface);
        }

        .method-tab.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary);
        }

        .login-form,
        .magic-link-form,
        .qr-login {
          padding: var(--space-xl);
        }

        .btn-full {
          width: 100%;
        }

        .login-links {
          display: flex;
          justify-content: space-between;
          margin-top: var(--space-md);
        }

        .link {
          color: var(--primary);
          font-size: 14px;
        }

        .qr-container {
          text-align: center;
        }

        .qr-code {
          max-width: 100%;
          height: auto;
          margin: 0 auto var(--space-md);
          border-radius: 8px;
          box-shadow: var(--shadow-md);
        }

        .qr-instructions {
          color: var(--text-secondary);
          margin-bottom: var(--space-sm);
        }

        .qr-expire-notice {
          font-size: 14px;
          color: var(--warning);
          margin-bottom: var(--space-md);
        }

        .magic-info {
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
          margin-top: var(--space-md);
        }

        .magic-sent {
          padding: var(--space-2xl);
          text-align: center;
        }

        .success-icon {
          margin-bottom: var(--space-md);
        }

        .magic-sent h2 {
          margin: 0 0 var(--space-sm);
        }

        .magic-expire {
          color: var(--text-secondary);
          font-size: 14px;
          margin: var(--space-md) 0 var(--space-xl);
        }

        .login-footer {
          padding: var(--space-md) var(--space-xl) var(--space-xl);
          text-align: center;
        }

        .security-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          color: var(--text-secondary);
          font-size: 14px;
          margin: 0;
        }

        .security-notice svg {
          flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .login-container {
            border-radius: 0;
            min-height: 100vh;
          }
        }
      `}</style>
    </div>
  );
}