import { h, createContext } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import { signal } from '@preact/signals';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { showNotification } from '../App';

// Global signals for photo state
export const photos = signal([]);
export const selectedPhotos = signal(new Set());
export const isUploading = signal(false);
export const uploadProgress = signal(0);

const PhotoContext = createContext();

export function PhotoProvider({ children }) {
  const [albums, setAlbums] = useState([]);
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [faceGroups, setFaceGroups] = useState([]);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      // Try to load from cache first
      const cached = await storage.getPhotos();
      if (cached.length > 0) {
        photos.value = cached;
      }

      // Then fetch from server
      const response = await api.getPhotos();
      photos.value = response.photos;
      
      // Update cache
      await storage.savePhotos(response.photos);
    } catch (error) {
      console.error('Failed to load photos:', error);
      // Use cached photos if available
    }
  };

  const uploadPhotos = async (files, options = {}) => {
    isUploading.value = true;
    uploadProgress.value = 0;

    try {
      const photoData = [];
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Compress if needed
        const compressed = await compressPhoto(file);
        
        // Detect faces if enabled
        let faces = [];
        if (options.detectFaces) {
          faces = await detectFaces(compressed);
        }
        
        photoData.push({
          file: compressed,
          faces,
          metadata: {
            originalName: file.name,
            takenAt: file.lastModified
          }
        });
        
        uploadProgress.value = ((i + 1) / files.length) * 30; // 30% for processing
      }

      // Upload to server
      const uploaded = await api.uploadPhotos(photoData, (progress) => {
        uploadProgress.value = 30 + (progress * 0.7); // 70% for upload
      });

      // Update local state
      photos.value = [...photos.value, ...uploaded];
      
      // Save to storage
      await storage.savePhotos(uploaded);
      
      showNotification(`${uploaded.length} photos uploaded successfully!`, 'success');
      
      return uploaded;
    } catch (error) {
      showNotification('Upload failed: ' + error.message, 'error');
      throw error;
    } finally {
      isUploading.value = false;
      uploadProgress.value = 0;
    }
  };

  const deletePhotos = async (photoIds) => {
    try {
      await api.deletePhotos(photoIds);
      
      // Update local state
      photos.value = photos.value.filter(p => !photoIds.includes(p.id));
      selectedPhotos.value = new Set();
      
      // Update storage
      await storage.deletePhotos(photoIds);
      
      showNotification(`${photoIds.length} photos deleted`, 'info');
    } catch (error) {
      showNotification('Failed to delete photos', 'error');
      throw error;
    }
  };

  const createShare = async (photoIds, options) => {
    try {
      const shareUrl = await api.createShare(photoIds, options);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      showNotification('Share link copied to clipboard!', 'success');
      
      return shareUrl;
    } catch (error) {
      showNotification('Failed to create share', 'error');
      throw error;
    }
  };

  const selectPhoto = (photoId) => {
    const newSelection = new Set(selectedPhotos.value);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    selectedPhotos.value = newSelection;
  };

  const selectAll = () => {
    selectedPhotos.value = new Set(photos.value.map(p => p.id));
  };

  const clearSelection = () => {
    selectedPhotos.value = new Set();
  };

  const value = {
    photos: photos.value,
    albums,
    currentAlbum,
    faceGroups,
    selectedPhotos: selectedPhotos.value,
    isUploading: isUploading.value,
    uploadProgress: uploadProgress.value,
    loadPhotos,
    uploadPhotos,
    deletePhotos,
    createShare,
    selectPhoto,
    selectAll,
    clearSelection,
    setCurrentAlbum
  };

  return (
    <PhotoContext.Provider value={value}>
      {children}
    </PhotoContext.Provider>
  );
}

export function usePhotos() {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhotos must be used within PhotoProvider');
  }
  return context;
}

// Helper functions
async function compressPhoto(file) {
  // Import dynamically to reduce initial bundle size
  const { imageCompressor } = await import('../services/imageCompressor');
  return imageCompressor.compressImage(file);
}

async function detectFaces(file) {
  // Import dynamically
  const { faceDetection } = await import('../services/faceDetection');
  return faceDetection.detectFaces(file);
}