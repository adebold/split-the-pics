import { api } from './api';

export class TimeLimitedLinksService {
  constructor() {
    this.activeLinks = new Map();
  }

  // Create a time-limited share link
  async createShareLink(photoIds, options = {}) {
    const defaultOptions = {
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxViews: null, // Unlimited
      requiresPassword: false,
      allowDownload: true,
      watermark: false,
      permissions: ['view']
    };

    const linkOptions = { ...defaultOptions, ...options };

    try {
      const response = await api.request('/shares/create', {
        method: 'POST',
        body: JSON.stringify({
          photoIds,
          ...linkOptions
        })
      });

      const link = {
        id: response.id,
        token: response.token,
        url: `${window.location.origin}/s/${response.token}`,
        shortUrl: response.shortUrl,
        createdAt: new Date(response.createdAt),
        expiresAt: new Date(response.expiresAt),
        maxViews: linkOptions.maxViews,
        viewCount: 0,
        ...linkOptions
      };

      // Store in local cache
      this.activeLinks.set(link.id, link);

      return link;
    } catch (error) {
      console.error('Failed to create share link:', error);
      throw error;
    }
  }

  // Create a magic link for passwordless login
  async createMagicLink(email, options = {}) {
    try {
      const response = await api.request('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({
          email,
          redirectUrl: options.redirectUrl || '/',
          expiresIn: options.expiresIn || 15 * 60 * 1000, // 15 minutes
          deviceInfo: this.getDeviceInfo()
        })
      });

      return {
        success: true,
        message: response.message || 'Magic link sent to your email',
        expiresAt: new Date(response.expiresAt)
      };
    } catch (error) {
      console.error('Failed to create magic link:', error);
      throw error;
    }
  }

  // Verify a time-limited token
  async verifyToken(token, type = 'share') {
    try {
      const response = await api.request(`/verify/${type}/${token}`, {
        method: 'POST',
        body: JSON.stringify({
          deviceInfo: this.getDeviceInfo()
        })
      });

      return response;
    } catch (error) {
      if (error.message.includes('expired')) {
        throw new Error('This link has expired');
      } else if (error.message.includes('max views')) {
        throw new Error('This link has reached its maximum views');
      }
      throw error;
    }
  }

  // Get link statistics
  async getLinkStats(linkId) {
    try {
      const response = await api.request(`/shares/${linkId}/stats`);
      
      return {
        viewCount: response.viewCount,
        uniqueViewers: response.uniqueViewers,
        downloads: response.downloads,
        lastAccessed: response.lastAccessed ? new Date(response.lastAccessed) : null,
        accessLog: response.accessLog.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }))
      };
    } catch (error) {
      console.error('Failed to get link stats:', error);
      throw error;
    }
  }

  // Revoke a share link
  async revokeLink(linkId) {
    try {
      await api.request(`/shares/${linkId}/revoke`, {
        method: 'POST'
      });

      // Remove from local cache
      this.activeLinks.delete(linkId);

      return true;
    } catch (error) {
      console.error('Failed to revoke link:', error);
      throw error;
    }
  }

  // Update link settings
  async updateLink(linkId, updates) {
    try {
      const response = await api.request(`/shares/${linkId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      // Update local cache
      if (this.activeLinks.has(linkId)) {
        const link = this.activeLinks.get(linkId);
        Object.assign(link, updates);
        if (response.expiresAt) {
          link.expiresAt = new Date(response.expiresAt);
        }
      }

      return response;
    } catch (error) {
      console.error('Failed to update link:', error);
      throw error;
    }
  }

  // Get all active links
  async getActiveLinks() {
    try {
      const response = await api.request('/shares/active');
      
      const links = response.links.map(link => ({
        ...link,
        createdAt: new Date(link.createdAt),
        expiresAt: new Date(link.expiresAt),
        lastAccessed: link.lastAccessed ? new Date(link.lastAccessed) : null
      }));

      // Update local cache
      this.activeLinks.clear();
      links.forEach(link => this.activeLinks.set(link.id, link));

      return links;
    } catch (error) {
      console.error('Failed to get active links:', error);
      throw error;
    }
  }

  // Generate a short URL for a share link
  async generateShortUrl(linkId) {
    try {
      const response = await api.request(`/shares/${linkId}/shorten`, {
        method: 'POST'
      });

      // Update local cache
      if (this.activeLinks.has(linkId)) {
        this.activeLinks.get(linkId).shortUrl = response.shortUrl;
      }

      return response.shortUrl;
    } catch (error) {
      console.error('Failed to generate short URL:', error);
      throw error;
    }
  }

  // Check if a link is still valid
  isLinkValid(link) {
    if (!link) return false;

    // Check expiration
    if (link.expiresAt && new Date() > link.expiresAt) {
      return false;
    }

    // Check view count
    if (link.maxViews && link.viewCount >= link.maxViews) {
      return false;
    }

    return true;
  }

  // Format remaining time for a link
  formatRemainingTime(expiresAt) {
    if (!expiresAt) return 'Never expires';

    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff < 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
    }
  }

  // Get device info for tracking
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer
    };
  }

  // Create a one-time view link
  async createOneTimeLink(photoIds) {
    return this.createShareLink(photoIds, {
      maxViews: 1,
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
      allowDownload: false,
      requiresPassword: true
    });
  }

  // Create a password-protected link
  async createPasswordProtectedLink(photoIds, password) {
    try {
      const response = await api.request('/shares/create-protected', {
        method: 'POST',
        body: JSON.stringify({
          photoIds,
          password,
          expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
        })
      });

      return {
        ...response,
        url: `${window.location.origin}/s/${response.token}`
      };
    } catch (error) {
      console.error('Failed to create password-protected link:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const timeLimitedLinks = new TimeLimitedLinksService();