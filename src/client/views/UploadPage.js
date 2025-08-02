import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import { usePhotos } from '../contexts/PhotoContext';
import { useAuth } from '../contexts/AuthContext';

export function UploadPage() {
  const { user } = useAuth();
  const { uploadPhoto } = usePhotos();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      let completed = 0;
      for (const file of selectedFiles) {
        await uploadPhoto(file);
        completed++;
        setUploadProgress((completed / selectedFiles.length) * 100);
      }
      
      // Reset after successful upload
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Redirect to photos page
      setTimeout(() => {
        window.location.href = '/photos';
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div class="upload-page">
        <div class="login-prompt">
          <h2>Please log in to upload photos</h2>
          <a href="/login" class="btn btn-primary">Log In</a>
        </div>
      </div>
    );
  }

  return (
    <div class="upload-page">
      <div class="page-header">
        <h1>Upload Photos</h1>
      </div>

      <div class="upload-container">
        <div class="upload-dropzone">
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <label for="file-input" class="dropzone-label">
            <div class="dropzone-content">
              <svg class="upload-icon" viewBox="0 0 24 24" width="48" height="48">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <p>Click to select photos or drag and drop</p>
              <p class="upload-hint">Supports JPG, PNG, GIF up to 50MB each</p>
            </div>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div class="selected-files">
            <h3>Selected Files ({selectedFiles.length})</h3>
            <ul class="file-list">
              {selectedFiles.map((file, index) => (
                <li key={index} class="file-item">
                  <span class="file-name">{file.name}</span>
                  <span class="file-size">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div class="error-message">
            <p>{error}</p>
          </div>
        )}

        {uploading && (
          <div class="upload-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                style={`width: ${uploadProgress}%`}
              ></div>
            </div>
            <p>Uploading... {Math.round(uploadProgress)}%</p>
          </div>
        )}

        <div class="upload-actions">
          <button
            class="btn btn-primary"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`}
          </button>
          <a href="/photos" class="btn btn-secondary">
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}