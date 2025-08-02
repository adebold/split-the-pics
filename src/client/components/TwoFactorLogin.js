import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { api } from '../services/api';
import { showNotification } from '../App';

export function TwoFactorLogin({ sessionToken, onSuccess, onCancel }) {
  const [method, setMethod] = useState('totp'); // totp or backup
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input
    if (method === 'totp' && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [method]);

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = code.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('');
    setCode(updatedCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (updatedCode.length === 6 && method === 'totp') {
      verifyCode(updatedCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setCode(pastedData);
    
    if (pastedData.length === 6) {
      verifyCode(pastedData);
    }
  };

  const verifyCode = async (codeToVerify = code) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.request('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken,
          code: codeToVerify,
          method,
          rememberDevice
        })
      });

      // Store tokens
      api.token = response.accessToken;
      api.refreshToken = response.refreshToken;
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      // Store device trust if requested
      if (rememberDevice && response.deviceToken) {
        localStorage.setItem('deviceToken', response.deviceToken);
      }

      showNotification('Login successful!', 'success');
      onSuccess(response);
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
      setCode('');
      // Re-focus first input
      if (method === 'totp') {
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeSubmit = (e) => {
    e.preventDefault();
    if (code.length >= 8) {
      verifyCode(code.toUpperCase().replace(/\s/g, ''));
    }
  };

  return (
    <div class="two-factor-login">
      <div class="login-header">
        <button class="back-button" onClick={onCancel}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h2>Two-Factor Authentication</h2>
        <p>Enter the code from your authenticator app</p>
      </div>

      <div class="auth-methods">
        <button
          class={`auth-method ${method === 'totp' ? 'active' : ''}`}
          onClick={() => setMethod('totp')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
          </svg>
          Authenticator App
        </button>
        <button
          class={`auth-method ${method === 'backup' ? 'active' : ''}`}
          onClick={() => setMethod('backup')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
          </svg>
          Backup Code
        </button>
      </div>

      {method === 'totp' ? (
        <div class="totp-input">
          <div class="code-inputs">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                ref={(el) => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength="1"
                class="code-digit"
                value={code[index] || ''}
                onInput={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={loading}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
              />
            ))}
          </div>

          {error && (
            <div class="error-message">
              {error}
            </div>
          )}

          <label class="remember-device">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span>Trust this device for 30 days</span>
          </label>
        </div>
      ) : (
        <form class="backup-input" onSubmit={handleBackupCodeSubmit}>
          <div class="input-group">
            <label class="label">Backup Code</label>
            <input
              type="text"
              class="input"
              placeholder="Enter backup code (e.g., XXXX-XXXX)"
              value={code}
              onInput={(e) => setCode(e.target.value.toUpperCase())}
              pattern="[A-Z0-9]{4}-?[A-Z0-9]{4}"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div class="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            class="btn btn-primary btn-full"
            disabled={loading || code.length < 8}
          >
            {loading ? 'Verifying...' : 'Verify Backup Code'}
          </button>
        </form>
      )}

      <div class="help-section">
        <button class="btn-text" onClick={() => window.navigate('/auth/recovery')}>
          Lost access to your authenticator?
        </button>
      </div>

      <style jsx>{`
        .two-factor-login {
          max-width: 400px;
          margin: 0 auto;
          padding: var(--space-md);
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-xl);
          position: relative;
        }

        .back-button {
          position: absolute;
          left: 0;
          top: 0;
          background: none;
          border: none;
          padding: var(--space-sm);
          cursor: pointer;
          color: var(--text-secondary);
        }

        .back-button:hover {
          color: var(--text-primary);
        }

        .login-header h2 {
          margin: 0 0 var(--space-sm);
        }

        .login-header p {
          margin: 0;
          color: var(--text-secondary);
        }

        .auth-methods {
          display: flex;
          gap: var(--space-sm);
          margin-bottom: var(--space-xl);
        }

        .auth-method {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: var(--space-md);
          border: 2px solid var(--border);
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 14px;
          color: var(--text-secondary);
        }

        .auth-method.active {
          border-color: var(--primary);
          background: var(--primary);
          color: white;
        }

        .auth-method svg {
          fill: currentColor;
        }

        .code-inputs {
          display: flex;
          gap: var(--space-sm);
          justify-content: center;
          margin-bottom: var(--space-md);
        }

        .code-digit {
          width: 48px;
          height: 56px;
          font-size: 24px;
          font-weight: 600;
          text-align: center;
          border: 2px solid var(--border);
          border-radius: 8px;
          transition: all var(--transition-fast);
        }

        .code-digit:focus {
          border-color: var(--primary);
          outline: none;
          transform: scale(1.05);
        }

        .code-digit:disabled {
          opacity: 0.5;
          background: var(--bg-tertiary);
        }

        .remember-device {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          margin: var(--space-lg) 0;
          cursor: pointer;
          font-size: 14px;
        }

        .remember-device input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          padding: var(--space-sm) var(--space-md);
          border-radius: 6px;
          font-size: 14px;
          margin: var(--space-md) 0;
          text-align: center;
        }

        .btn-full {
          width: 100%;
        }

        .help-section {
          text-align: center;
          margin-top: var(--space-xl);
          padding-top: var(--space-lg);
          border-top: 1px solid var(--border);
        }

        @media (max-width: 480px) {
          .code-digit {
            width: 42px;
            height: 50px;
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}