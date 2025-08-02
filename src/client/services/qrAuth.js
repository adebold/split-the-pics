import QRCode from 'qrcode';
import { api } from './api';

export class QRAuthService {
  constructor() {
    this.pollInterval = null;
    this.sessionId = null;
  }

  // Generate QR code for passwordless login
  async generateLoginQR() {
    try {
      // Request a new auth session from server
      const response = await api.request('/auth/qr/session', {
        method: 'POST',
        body: JSON.stringify({
          deviceInfo: this.getDeviceInfo()
        })
      });

      this.sessionId = response.sessionId;
      const authUrl = `${window.location.origin}/auth/qr/${response.token}`;

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(authUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      });

      return {
        qrCode: qrCodeDataURL,
        sessionId: this.sessionId,
        expiresAt: response.expiresAt
      };
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw error;
    }
  }

  // Poll server for authentication status
  startPolling(sessionId, onSuccess, onError) {
    this.stopPolling(); // Clear any existing polling
    
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes (5 second intervals)
    
    this.pollInterval = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        this.stopPolling();
        onError(new Error('QR code expired'));
        return;
      }

      try {
        const response = await api.request(`/auth/qr/status/${sessionId}`);
        
        if (response.status === 'authenticated') {
          this.stopPolling();
          
          // Store tokens
          api.token = response.accessToken;
          api.refreshToken = response.refreshToken;
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          
          onSuccess(response);
        } else if (response.status === 'expired') {
          this.stopPolling();
          onError(new Error('QR code expired'));
        }
        // Continue polling if status is 'pending'
      } catch (error) {
        // Continue polling on network errors
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Generate shareable link with QR code
  async generateShareQR(photoIds, options = {}) {
    try {
      const response = await api.request('/shares/qr', {
        method: 'POST',
        body: JSON.stringify({
          photoIds,
          expiresIn: options.expiresIn || 7 * 24 * 60 * 60 * 1000, // 7 days default
          maxViews: options.maxViews,
          requiresAuth: options.requiresAuth || false,
          permissions: options.permissions || ['view']
        })
      });

      const shareUrl = `${window.location.origin}/s/${response.token}`;

      // Generate QR code for the share link
      const qrCodeDataURL = await QRCode.toDataURL(shareUrl, {
        errorCorrectionLevel: 'L',
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        width: 250
      });

      return {
        qrCode: qrCodeDataURL,
        shareUrl,
        token: response.token,
        expiresAt: response.expiresAt
      };
    } catch (error) {
      console.error('Failed to generate share QR:', error);
      throw error;
    }
  }

  // Scan QR code from camera or image
  async scanQRCode(imageSource) {
    try {
      let imageData;
      
      if (imageSource instanceof File) {
        // Convert file to data URL
        imageData = await this.fileToDataURL(imageSource);
      } else if (typeof imageSource === 'string') {
        // Already a data URL or image URL
        imageData = imageSource;
      } else {
        throw new Error('Invalid image source');
      }

      // Use QRCode library to decode
      const code = await QRCode.toString(imageData, { type: 'terminal' });
      
      // Extract URL from QR code
      const urlMatch = code.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        return urlMatch[0];
      }
      
      throw new Error('No valid URL found in QR code');
    } catch (error) {
      console.error('Failed to scan QR code:', error);
      throw error;
    }
  }

  // Helper to convert file to data URL
  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Get device information for security
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/Android/i.test(ua)) {
      deviceType = 'android';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      deviceType = 'ios';
    } else if (/Windows Phone/i.test(ua)) {
      deviceType = 'windows-phone';
    }

    return {
      userAgent: ua,
      deviceType,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Verify QR authentication token
  async verifyQRToken(token) {
    try {
      const response = await api.request('/auth/qr/verify', {
        method: 'POST',
        body: JSON.stringify({ token })
      });

      return response;
    } catch (error) {
      console.error('Failed to verify QR token:', error);
      throw error;
    }
  }

  // Clean up
  destroy() {
    this.stopPolling();
  }
}

// Export singleton instance
export const qrAuth = new QRAuthService();