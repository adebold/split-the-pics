import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { unsplash } from '../services/unsplash';

export function BackgroundImage({ theme = 'login', blur = true, overlay = true }) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBackgroundImage();
  }, [theme]);

  const loadBackgroundImage = async () => {
    try {
      setLoading(true);
      
      // Get appropriate image for the theme
      const url = unsplash.getThemedImage(theme, {
        width: window.innerWidth,
        height: window.innerHeight
      });

      // Preload the image
      await unsplash.preloadImage(url);
      setImageUrl(url);
    } catch (error) {
      console.error('Failed to load background image:', error);
      // Fallback to gradient if image fails
      setImageUrl('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="background-image-container">
      {/* Gradient fallback while loading or on error */}
      <div 
        class="background-gradient"
        style={{
          background: `linear-gradient(135deg, 
            ${theme === 'signup' ? '#667eea 0%, #764ba2 100%' : '#2563eb 0%, #0ea5e9 100%'}`
        }}
      />
      
      {/* Actual image */}
      {imageUrl && (
        <div 
          class={`background-image ${loading ? 'loading' : 'loaded'} ${blur ? 'blurred' : ''}`}
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      
      {/* Overlay for better text readability */}
      {overlay && (
        <div class="background-overlay" />
      )}
    </div>
  );
}