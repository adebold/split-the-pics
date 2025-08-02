import imageCompression from 'browser-image-compression';

class ImageCompressor {
  constructor() {
    this.defaultOptions = {
      maxSizeMB: 5,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      maxIteration: 10,
      quality: 0.8
    };
  }

  async compressImage(file, options = {}) {
    try {
      const compressionOptions = { ...this.defaultOptions, ...options };
      
      // Skip compression for already small files
      if (file.size < compressionOptions.maxSizeMB * 1024 * 1024) {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            
            // Check if image dimensions are within limits
            if (img.width <= compressionOptions.maxWidthOrHeight && 
                img.height <= compressionOptions.maxWidthOrHeight) {
              resolve(file);
            } else {
              // Need to resize even if file size is small
              this._performCompression(file, compressionOptions).then(resolve).catch(reject);
            }
          };
          
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
          };
          
          img.src = objectUrl;
        });
      }
      
      // Compress the image
      return await this._performCompression(file, compressionOptions);
    } catch (error) {
      console.error('Image compression failed:', error);
      // Return original file if compression fails
      return file;
    }
  }

  async _performCompression(file, options) {
    const compressedFile = await imageCompression(file, options);
    
    // Ensure the compressed file has the correct type
    if (compressedFile.type !== file.type) {
      return new File([compressedFile], file.name, {
        type: file.type,
        lastModified: Date.now()
      });
    }
    
    return compressedFile;
  }

  async compressBatch(files, options = {}) {
    const compressionPromises = files.map(file => this.compressImage(file, options));
    return await Promise.all(compressionPromises);
  }

  // Get image dimensions without loading the full image
  async getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          width: img.width,
          height: img.height
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = objectUrl;
    });
  }

  // Generate thumbnail for preview
  async generateThumbnail(file, maxSize = 200) {
    try {
      const thumbnailOptions = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: maxSize,
        useWebWorker: true,
        quality: 0.7
      };
      
      const thumbnail = await imageCompression(file, thumbnailOptions);
      return URL.createObjectURL(thumbnail);
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return URL.createObjectURL(file);
    }
  }
}

export const imageCompressor = new ImageCompressor();