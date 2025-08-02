import { openDB } from 'idb';

class LocalStorage {
  constructor() {
    this.dbName = 'SecureSnapDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    if (this.db) return;

    this.db = await openDB(this.dbName, this.version, {
      upgrade(db) {
        // Photos store
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { 
            keyPath: 'id' 
          });
          photoStore.createIndex('timestamp', 'timestamp');
          photoStore.createIndex('albumId', 'albumId');
        }

        // Face embeddings store
        if (!db.objectStoreNames.contains('faces')) {
          const faceStore = db.createObjectStore('faces', { 
            keyPath: 'id' 
          });
          faceStore.createIndex('photoId', 'photoId');
          faceStore.createIndex('embedding', 'embedding');
        }

        // Albums store
        if (!db.objectStoreNames.contains('albums')) {
          const albumStore = db.createObjectStore('albums', { 
            keyPath: 'id' 
          });
          albumStore.createIndex('createdAt', 'createdAt');
        }

        // Uploads queue store
        if (!db.objectStoreNames.contains('uploadQueue')) {
          db.createObjectStore('uploadQueue', { 
            keyPath: 'id' 
          });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      }
    });
  }

  async savePhotos(photos) {
    await this.init();
    const tx = this.db.transaction('photos', 'readwrite');
    
    await Promise.all(photos.map(photo => 
      tx.store.put(photo)
    ));
    
    await tx.done;
  }

  async getPhotos(limit = 100, offset = 0) {
    await this.init();
    const tx = this.db.transaction('photos', 'readonly');
    const index = tx.store.index('timestamp');
    
    const photos = [];
    let cursor = await index.openCursor(null, 'prev');
    let count = 0;
    
    while (cursor && count < limit + offset) {
      if (count >= offset) {
        photos.push(cursor.value);
      }
      count++;
      cursor = await cursor.continue();
    }
    
    return photos;
  }

  async getPhoto(id) {
    await this.init();
    return await this.db.get('photos', id);
  }

  async deletePhotos(ids) {
    await this.init();
    const tx = this.db.transaction(['photos', 'faces'], 'readwrite');
    
    // Delete photos
    await Promise.all(ids.map(id => 
      tx.objectStore('photos').delete(id)
    ));
    
    // Delete associated faces
    const faceStore = tx.objectStore('faces');
    const faceIndex = faceStore.index('photoId');
    
    for (const photoId of ids) {
      let cursor = await faceIndex.openCursor(photoId);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    }
    
    await tx.done;
  }

  async saveFaces(faces) {
    await this.init();
    const tx = this.db.transaction('faces', 'readwrite');
    
    await Promise.all(faces.map(face => 
      tx.store.put(face)
    ));
    
    await tx.done;
  }

  async searchFacesByEmbedding(embedding, threshold = 0.8) {
    await this.init();
    const tx = this.db.transaction('faces', 'readonly');
    const allFaces = await tx.store.getAll();
    
    return allFaces.filter(face => {
      const similarity = this.calculateEmbeddingSimilarity(
        face.embedding, 
        embedding
      );
      return similarity > threshold;
    });
  }

  calculateEmbeddingSimilarity(emb1, emb2) {
    // Simple similarity calculation
    // In production, use proper distance metrics
    if (!emb1 || !emb2) return 0;
    
    let matches = 0;
    const len = Math.min(emb1.length, emb2.length);
    
    for (let i = 0; i < len; i++) {
      if (emb1[i] === emb2[i]) matches++;
    }
    
    return matches / len;
  }

  async addToUploadQueue(item) {
    await this.init();
    await this.db.add('uploadQueue', {
      id: crypto.randomUUID(),
      ...item,
      timestamp: Date.now()
    });
  }

  async getUploadQueue() {
    await this.init();
    return await this.db.getAll('uploadQueue');
  }

  async removeFromUploadQueue(id) {
    await this.init();
    await this.db.delete('uploadQueue', id);
  }

  async saveSettings(settings) {
    await this.init();
    await this.db.put('settings', settings, 'user');
  }

  async getSettings() {
    await this.init();
    return await this.db.get('settings', 'user') || {};
  }

  async clearAll() {
    await this.init();
    const tx = this.db.transaction(
      ['photos', 'faces', 'albums', 'uploadQueue', 'settings'], 
      'readwrite'
    );
    
    await Promise.all([
      tx.objectStore('photos').clear(),
      tx.objectStore('faces').clear(),
      tx.objectStore('albums').clear(),
      tx.objectStore('uploadQueue').clear(),
      tx.objectStore('settings').clear()
    ]);
    
    await tx.done;
  }

  async getStorageSize() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percent: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
      };
    }
    return null;
  }

  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
      return isPersisted;
    }
    return false;
  }
}

export const storage = new LocalStorage();