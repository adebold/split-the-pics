import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { PhotoGallery } from '../components/PhotoGallery';
import { usePhotos } from '../contexts/PhotoContext';
import { useAuth } from '../contexts/AuthContext';

export function PhotosPage() {
  const { user } = useAuth();
  const { photos, loading, error, loadPhotos } = usePhotos();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) {
      loadPhotos();
    }
  }, [user]);

  if (!user) {
    return (
      <div class="photos-page">
        <div class="login-prompt">
          <h2>Please log in to view your photos</h2>
          <a href="/login" class="btn btn-primary">Log In</a>
        </div>
      </div>
    );
  }

  return (
    <div class="photos-page">
      <div class="page-header">
        <h1>My Photos</h1>
        <div class="photo-filters">
          <button 
            class={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            class={`filter-btn ${filter === 'recent' ? 'active' : ''}`}
            onClick={() => setFilter('recent')}
          >
            Recent
          </button>
          <button 
            class={`filter-btn ${filter === 'shared' ? 'active' : ''}`}
            onClick={() => setFilter('shared')}
          >
            Shared
          </button>
        </div>
      </div>

      {loading && (
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Loading your photos...</p>
        </div>
      )}

      {error && (
        <div class="error-message">
          <p>Error loading photos: {error.message}</p>
          <button onClick={loadPhotos} class="btn btn-secondary">
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && photos.length === 0 && (
        <div class="empty-state">
          <h3>No photos yet</h3>
          <p>Start by uploading your first photo</p>
          <a href="/upload" class="btn btn-primary">
            Upload Photo
          </a>
        </div>
      )}

      {!loading && !error && photos.length > 0 && (
        <PhotoGallery photos={photos} filter={filter} />
      )}
    </div>
  );
}