import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { Router } from './components/Router';
import { AuthProvider } from './contexts/AuthContext';
import { PhotoProvider } from './contexts/PhotoContext';
import { storage } from './services/storage';
import { api } from './services/api';

// Global signals for app state
export const isOnline = signal(navigator.onLine);
export const isLoading = signal(false);
export const notifications = signal([]);

export function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize app
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize storage
      await storage.init();

      // Check authentication
      const token = localStorage.getItem('accessToken');
      if (token) {
        api.token = token;
        // Verify token validity
        try {
          await api.request('/api/auth/verify');
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }

      // Setup online/offline listeners
      window.addEventListener('online', () => {
        isOnline.value = true;
        // Sync offline queue
        api.syncOfflineQueue();
      });

      window.addEventListener('offline', () => {
        isOnline.value = false;
      });

      // Request persistent storage
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const isPersisted = await navigator.storage.persist();
        console.log(`Persistent storage: ${isPersisted ? 'granted' : 'denied'}`);
      }

      setIsReady(true);
    } catch (error) {
      console.error('App initialization failed:', error);
      setIsReady(true); // Still show app but with error state
    }
  };

  if (!isReady) {
    return (
      <div class="app-loading">
        <div class="spinner"></div>
        <p>Loading SecureSnap...</p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <PhotoProvider>
        <div class="app">
          <Router />
          <NotificationContainer />
        </div>
      </PhotoProvider>
    </AuthProvider>
  );
}

// Notification container component
function NotificationContainer() {
  return (
    <div class="notification-container">
      {notifications.value.map(notification => (
        <Notification key={notification.id} {...notification} />
      ))}
    </div>
  );
}

function Notification({ id, type, message, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeNotification(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration]);

  return (
    <div class={`notification notification-${type}`}>
      <span>{message}</span>
      <button 
        class="notification-close"
        onClick={() => removeNotification(id)}
      >
        ×
      </button>
    </div>
  );
}

// Helper functions
export function showNotification(message, type = 'info') {
  const id = Date.now();
  notifications.value = [...notifications.value, { id, type, message }];
}

function removeNotification(id) {
  notifications.value = notifications.value.filter(n => n.id !== id);
}