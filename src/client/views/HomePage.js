import { h } from 'preact';
import { useAuth } from '../contexts/AuthContext';

export function HomePage({ navigate }) {
  const { user } = useAuth();

  return (
    <div class="home-page">
      <header class="hero">
        <div class="hero-content">
          <h1>Welcome to SecureSnap</h1>
          <p class="hero-subtitle">
            Share your photos securely with face detection and end-to-end encryption
          </p>
          
          {user ? (
            <div class="hero-actions">
              <button 
                class="btn btn-primary"
                onClick={() => navigate('/upload')}
              >
                Upload Photos
              </button>
              <button 
                class="btn btn-secondary"
                onClick={() => navigate('/photos')}
              >
                View Gallery
              </button>
            </div>
          ) : (
            <div class="hero-actions">
              <button 
                class="btn btn-primary"
                onClick={() => navigate('/login')}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      <section class="features">
        <div class="container">
          <h2 class="text-center">Why SecureSnap?</h2>
          
          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="var(--primary)" />
                </svg>
              </div>
              <h3>End-to-End Encryption</h3>
              <p>Your photos are encrypted before leaving your device and only you control the keys.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="var(--primary)" />
                </svg>
              </div>
              <h3>Time-Limited Sharing</h3>
              <p>Share photos with automatic expiration dates to maintain control over your content.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="var(--primary)" />
                </svg>
              </div>
              <h3>Privacy-First Design</h3>
              <p>Face detection happens on your device. We never see or store your biometric data.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" fill="var(--primary)" />
                </svg>
              </div>
              <h3>Offline First</h3>
              <p>Works offline and syncs when connected. Your photos are always accessible.</p>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .home-page {
          min-height: 100vh;
        }

        .hero {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          padding: calc(var(--space-2xl) + var(--safe-top)) var(--space-md) var(--space-2xl);
          text-align: center;
        }

        .hero-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .hero h1 {
          font-size: 2.5rem;
          margin-bottom: var(--space-md);
        }

        .hero-subtitle {
          font-size: 1.125rem;
          opacity: 0.9;
          margin-bottom: var(--space-xl);
        }

        .hero-actions {
          display: flex;
          gap: var(--space-md);
          justify-content: center;
          flex-wrap: wrap;
        }

        .features {
          padding: var(--space-2xl) var(--space-md);
          background: var(--bg-secondary);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-lg);
          margin-top: var(--space-xl);
        }

        .feature-card {
          background: var(--surface);
          padding: var(--space-xl);
          border-radius: 12px;
          text-align: center;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-base), box-shadow var(--transition-base);
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .feature-icon {
          display: inline-flex;
          margin-bottom: var(--space-md);
        }

        .feature-card h3 {
          margin-bottom: var(--space-sm);
          color: var(--text-primary);
        }

        .feature-card p {
          color: var(--text-secondary);
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2rem;
          }
          
          .feature-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}