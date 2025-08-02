import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { timeLimitedLinks } from '../services/timeLimitedLinks';
import { PhotoGallery } from '../components/PhotoGallery';
import { showNotification } from '../App';

export function SharePage({ params }) {
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    loadShare();
  }, [params.shareId]);

  const loadShare = async (withPassword = null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await timeLimitedLinks.verifyToken(params.shareId, 'share');
      
      if (response.requiresPassword && !withPassword) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      if (response.requiresPassword && withPassword) {
        // Include password in verification
        const authResponse = await api.request(`/shares/${params.shareId}/unlock`, {
          method: 'POST',
          body: JSON.stringify({ password: withPassword })
        });
        setShareData(authResponse);
      } else {
        setShareData(response);
      }

      // Track view
      await api.request(`/shares/${params.shareId}/view`, {
        method: 'POST',
        body: JSON.stringify({
          deviceInfo: timeLimitedLinks.getDeviceInfo()
        })
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      showNotification('Please enter a password', 'error');
      return;
    }

    await loadShare(password);
  };

  const downloadPhoto = async (photo) => {
    if (!shareData.permissions.includes('download')) {
      showNotification('Downloads are not allowed for this share', 'error');
      return;
    }

    try {
      const response = await fetch(photo.downloadUrl);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename || `photo-${photo.id}.jpg`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      // Track download
      await api.request(`/shares/${params.shareId}/download/${photo.id}`, {
        method: 'POST'
      });
      
    } catch (error) {
      showNotification('Download failed', 'error');
    }
  };

  if (loading) {
    return (
      <div class="share-loading">
        <div class="spinner"></div>
        <p>Loading shared photos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div class="share-error">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="var(--danger)" />
          </svg>
        </div>
        <h2>Unable to Load Share</h2>
        <p>{error}</p>
        
        {error.includes('expired') && (
          <p class="error-detail">This link has expired and is no longer valid.</p>
        )}
        
        {error.includes('max views') && (
          <p class="error-detail">This link has reached its maximum number of views.</p>
        )}
        
        <button class="btn btn-primary" onClick={() => window.navigate('/')}>
          Go to Homepage
        </button>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div class="share-password">
        <div class="password-container">
          <div class="lock-icon">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="var(--primary)" />
            </svg>
          </div>
          
          <h2>Password Protected</h2>
          <p>This share is protected. Please enter the password to continue.</p>
          
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              class="input"
              placeholder="Enter password"
              value={password}
              onInput={(e) => setPassword(e.target.value)}
              autoFocus
            />
            
            <button type="submit" class="btn btn-primary btn-full">
              Unlock Photos
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!shareData) {
    return null;
  }

  return (
    <div class="share-page">
      <header class="share-header">
        <div class="share-info">
          <h1>{shareData.title || 'Shared Photos'}</h1>
          {shareData.description && (
            <p class="share-description">{shareData.description}</p>
          )}
          
          <div class="share-meta">
            <span class="photo-count">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
              {shareData.photos.length} photos
            </span>
            
            {shareData.expiresAt && (
              <span class="expire-time">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
                {timeLimitedLinks.formatRemainingTime(shareData.expiresAt)}
              </span>
            )}
            
            {shareData.maxViews && (
              <span class="view-limit">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                {shareData.viewCount} / {shareData.maxViews} views
              </span>
            )}
          </div>
        </div>

        {shareData.permissions.includes('download') && (
          <button
            class="btn btn-primary download-all"
            onClick={() => downloadAllPhotos()}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="white" />
            </svg>
            Download All
          </button>
        )}
      </header>

      <PhotoGallery
        photos={shareData.photos}
        onPhotoClick={(photo) => {
          // Open photo viewer
        }}
        onDownload={shareData.permissions.includes('download') ? downloadPhoto : null}
        watermark={shareData.watermark}
      />

      <footer class="share-footer">
        <p class="branding">
          Shared securely with 
          <a href="/" class="brand-link">SecureSnap</a>
        </p>
      </footer>

      <style jsx>{`
        .share-page {
          min-height: 100vh;
          background: var(--bg-secondary);
        }

        .share-loading,
        .share-error,
        .share-password {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--space-md);
        }

        .share-loading p,
        .share-error p {
          margin-top: var(--space-md);
          color: var(--text-secondary);
        }

        .error-icon,
        .lock-icon {
          margin-bottom: var(--space-lg);
        }

        .error-detail {
          font-size: 14px;
          margin-bottom: var(--space-xl);
        }

        .password-container {
          background: var(--surface);
          padding: var(--space-2xl);
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          max-width: 400px;
          width: 100%;
        }

        .password-container form {
          margin-top: var(--space-xl);
        }

        .password-container .input {
          margin-bottom: var(--space-md);
        }

        .share-header {
          background: var(--surface);
          padding: calc(var(--space-xl) + var(--safe-top)) var(--space-md) var(--space-xl);
          border-bottom: 1px solid var(--border);
        }

        .share-info h1 {
          margin: 0 0 var(--space-sm);
        }

        .share-description {
          color: var(--text-secondary);
          margin: 0 0 var(--space-md);
        }

        .share-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-lg);
          font-size: 14px;
          color: var(--text-secondary);
        }

        .share-meta span {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }

        .share-meta svg {
          fill: currentColor;
          opacity: 0.7;
        }

        .download-all {
          margin-top: var(--space-md);
          display: inline-flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .share-footer {
          padding: var(--space-xl) var(--space-md) calc(var(--space-xl) + var(--safe-bottom));
          text-align: center;
        }

        .branding {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .brand-link {
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
        }

        @media (min-width: 768px) {
          .share-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .download-all {
            margin-top: 0;
          }
        }
      `}</style>
    </div>
  );
}