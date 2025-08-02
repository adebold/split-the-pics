// Background image service with multiple providers
class BackgroundImageService {
  constructor() {
    // Fallback to Lorem Picsum since Unsplash Source is often unreliable
    this.providers = [
      {
        name: 'picsum',
        baseUrl: 'https://picsum.photos',
        available: true
      },
      {
        name: 'unsplash',
        baseUrl: 'https://source.unsplash.com',
        available: false // Will be checked dynamically
      }
    ];
    
    this.themes = {
      login: ['nature', 'landscape', 'peaceful'],
      signup: ['abstract', 'colorful', 'vibrant'],
      share: ['people', 'together', 'community'],
      default: ['minimal', 'clean']
    };
  }

  // Get a random image URL
  getRandomImage(options = {}) {
    const {
      width = 1920,
      height = 1080,
      theme = 'default'
    } = options;

    // Use Picsum as primary provider (more reliable)
    const provider = this.providers.find(p => p.name === 'picsum');
    
    // Generate random image ID for variety
    const imageId = Math.floor(Math.random() * 1000) + 1;
    
    // Build Picsum URL with blur and filters
    let url = `${provider.baseUrl}/${width}/${height}?random=${imageId}`;
    
    // Add grayscale for certain themes
    if (theme === 'login') {
      url += '&grayscale';
    }
    
    // Add slight blur for better text overlay
    url += '&blur=1';

    return url;
  }

  // Get image for specific theme
  getThemedImage(theme, dimensions = {}) {
    return this.getRandomImage({
      ...dimensions,
      theme
    });
  }

  // Preload an image
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  // Get multiple random images
  async getImageCollection(count = 5, options = {}) {
    const urls = [];
    for (let i = 0; i < count; i++) {
      urls.push(this.getRandomImage(options));
    }
    return urls;
  }

  // Get a curated list of photography-related images
  getPhotographyImages(options = {}) {
    return this.getRandomImage({
      ...options,
      query: 'camera,photography,photographer',
      collections: ['minimal', 'abstract']
    });
  }
}

export const unsplash = new BackgroundImageService();