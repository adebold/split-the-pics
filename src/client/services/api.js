import { storage } from './storage';
import { showNotification } from '../App';

class API {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '/api';
    this.token = null;
    this.refreshToken = null;
    this.adminToken = null;
    this.adminRefreshToken = null;
    this.ws = null;
    this.initializeAuth();
  }

  async initializeAuth() {
    // Load tokens from storage
    this.token = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.adminToken = localStorage.getItem('adminAccessToken');
    this.adminRefreshToken = localStorage.getItem('adminRefreshToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Use admin token for admin endpoints
    const isAdminEndpoint = endpoint.startsWith('/admin');
    const token = isAdminEndpoint ? this.adminToken : this.token;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      if (response.status === 401) {
        // Try to refresh token
        await this.refreshAccessToken();
        // Retry request
        headers['Authorization'] = `Bearer ${this.token}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: 'include'
        });
        return this.handleResponse(retryResponse);
      }

      return this.handleResponse(response);
    } catch (error) {
      // Network error - try offline fallback
      if (!navigator.onLine) {
        return this.handleOffline(endpoint, options);
      }
      throw error;
    }
  }

  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response;
  }

  async handleOffline(endpoint, options) {
    // Queue request for later
    await storage.addToUploadQueue({
      endpoint,
      options,
      timestamp: Date.now()
    });

    // Return cached data if available
    if (options.method === 'GET') {
      // Try to return from cache
      throw new Error('Offline - request queued');
    }

    throw new Error('Offline - request queued');
  }

  async uploadPhotos(photos, onProgress) {
    const formData = new FormData();
    
    photos.forEach((photo, index) => {
      formData.append(`photo_${index}`, photo.file);
      formData.append(`faces_${index}`, JSON.stringify(photo.faces));
    });

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress?.(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', `${this.baseURL}/photos/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      xhr.send(formData);
    });
  }

  async getPhotos(options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 100,
      offset: options.offset || 0,
      albumId: options.albumId || '',
      ...options
    });

    return this.request(`/photos?${params}`);
  }

  async createShare(photoIds, options = {}) {
    const response = await this.request('/shares', {
      method: 'POST',
      body: JSON.stringify({
        photoIds,
        ...options
      })
    });

    return `${window.location.origin}/s/${response.token}`;
  }

  async deletePhotos(photoIds) {
    return this.request('/photos', {
      method: 'DELETE',
      body: JSON.stringify({ photoIds })
    });
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    this.token = response.accessToken;
    this.refreshToken = response.refreshToken;

    // Save tokens
    localStorage.setItem('accessToken', this.token);
    localStorage.setItem('refreshToken', this.refreshToken);

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.token = null;
      this.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.token = data.accessToken;

    localStorage.setItem('accessToken', this.token);
  }

  // Sync offline queue
  async syncOfflineQueue() {
    const queue = await storage.getUploadQueue();
    
    for (const item of queue) {
      try {
        await this.request(item.endpoint, item.options);
        await storage.removeFromUploadQueue(item.id);
      } catch (error) {
        console.error('Sync failed for:', item, error);
      }
    }
  }

  // WebSocket for real-time updates
  connectWebSocket() {
    if (this.ws) return;

    const wsUrl = this.baseURL.replace('http', 'ws');
    this.ws = new WebSocket(`${wsUrl}/ws`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: this.token
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealtimeUpdate(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 5 seconds
      setTimeout(() => {
        this.ws = null;
        if (this.token) {
          this.connectWebSocket();
        }
      }, 5000);
    };
  }

  handleRealtimeUpdate(data) {
    switch (data.type) {
      case 'photo_shared':
        // Notify user of new shared photos
        showNotification(`${data.payload.photoCount} new photos shared!`, 'info');
        break;
      case 'processing_complete':
        // Update photo with processed data
        window.dispatchEvent(new CustomEvent('photo-processed', { detail: data.payload }));
        break;
      case 'face_match':
        // Notify of face matches found
        showNotification('New face matches found', 'success');
        break;
    }
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const api = new API();