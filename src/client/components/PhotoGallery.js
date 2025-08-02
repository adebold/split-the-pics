import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { TouchManager } from '../utils/touchManager';

export function PhotoGallery({ photos, onPhotoClick, onDownload, watermark = false }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or viewer
  const galleryRef = useRef();
  const viewerRef = useRef();
  const touchManager = useRef(null);

  useEffect(() => {
    if (viewMode === 'viewer' && viewerRef.current) {
      // Initialize touch gestures for viewer
      touchManager.current = new TouchManager(viewerRef.current);
      
      // Handle swipe gestures
      touchManager.current.on('swipe', (e) => {
        if (e.direction === 'left' && selectedIndex < photos.length - 1) {
          setSelectedIndex(selectedIndex + 1);
        } else if (e.direction === 'right' && selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1);
        } else if (e.direction === 'down') {
          closeViewer();
        }
      });

      // Handle pinch to zoom
      touchManager.current.on('pinch', (e) => {
        // Implement zoom functionality
      });

      return () => {
        touchManager.current?.destroy();
      };
    }
  }, [viewMode, selectedIndex, photos.length]);

  const openViewer = (index) => {
    setSelectedIndex(index);
    setViewMode('viewer');
    document.body.style.overflow = 'hidden';
  };

  const closeViewer = () => {
    setViewMode('grid');
    setSelectedIndex(null);
    document.body.style.overflow = '';
  };

  const renderPhotoThumbnail = (photo, index) => (
    <div
      key={photo.id}
      class="photo-thumbnail"
      onClick={() => {
        if (onPhotoClick) {
          onPhotoClick(photo);
        } else {
          openViewer(index);
        }
      }}
    >
      <img
        src={photo.thumbnailUrl || photo.url}
        alt=""
        loading="lazy"
        decoding="async"
      />
      
      {watermark && (
        <div class="watermark">SecureSnap</div>
      )}
      
      {photo.faceCount > 0 && (
        <span class="face-count">{photo.faceCount}</span>
      )}
    </div>
  );

  return (
    <>
      <div ref={galleryRef} class="photo-gallery-grid">
        {photos.map((photo, index) => renderPhotoThumbnail(photo, index))}
      </div>

      {viewMode === 'viewer' && selectedIndex !== null && (
        <div class="photo-viewer" ref={viewerRef}>
          <div class="viewer-header">
            <button class="viewer-close" onClick={closeViewer}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white" />
              </svg>
            </button>
            
            <span class="photo-counter">
              {selectedIndex + 1} / {photos.length}
            </span>

            {onDownload && (
              <button 
                class="viewer-download"
                onClick={() => onDownload(photos[selectedIndex])}
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="white" />
                </svg>
              </button>
            )}
          </div>

          <div class="viewer-content">
            <img
              src={photos[selectedIndex].url}
              alt=""
              class="viewer-image"
            />
            
            {watermark && (
              <div class="viewer-watermark">SecureSnap</div>
            )}
          </div>

          <div class="viewer-nav">
            <button
              class="nav-prev"
              onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0}
            >
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="white" />
              </svg>
            </button>

            <button
              class="nav-next"
              onClick={() => setSelectedIndex(Math.min(photos.length - 1, selectedIndex + 1))}
              disabled={selectedIndex === photos.length - 1}
            >
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="white" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .photo-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 2px;
          padding: 2px;
        }

        .photo-thumbnail {
          aspect-ratio: 1;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          background: var(--bg-tertiary);
        }

        .photo-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-base);
        }

        .photo-thumbnail:hover img {
          transform: scale(1.05);
        }

        .watermark {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          opacity: 0.8;
        }

        .face-count {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
        }

        .photo-viewer {
          position: fixed;
          inset: 0;
          background: black;
          z-index: 9999;
          display: flex;
          flex-direction: column;
        }

        .viewer-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: calc(var(--space-md) + var(--safe-top)) var(--space-md) var(--space-md);
          background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
          z-index: 1;
        }

        .viewer-close,
        .viewer-download {
          background: rgba(0, 0, 0, 0.5);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .viewer-close:active,
        .viewer-download:active {
          background: rgba(0, 0, 0, 0.8);
        }

        .photo-counter {
          color: white;
          font-size: 14px;
          font-weight: 500;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        }

        .viewer-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .viewer-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .viewer-watermark {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          font-size: 16px;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          opacity: 0.8;
        }

        .viewer-nav {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          transform: translateY(-50%);
          display: flex;
          justify-content: space-between;
          padding: 0 var(--space-md);
          pointer-events: none;
        }

        .nav-prev,
        .nav-next {
          background: rgba(0, 0, 0, 0.5);
          border: none;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          pointer-events: auto;
          transition: all var(--transition-fast);
        }

        .nav-prev:disabled,
        .nav-next:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .nav-prev:not(:disabled):active,
        .nav-next:not(:disabled):active {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(0.95);
        }

        @media (min-width: 768px) {
          .photo-gallery-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
            padding: 8px;
          }

          .photo-thumbnail {
            border-radius: 8px;
          }
        }
      `}</style>
    </>
  );
}