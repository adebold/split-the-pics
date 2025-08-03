import { FaceDetection } from '@mediapipe/face_detection';

class FaceDetectionService {
  constructor() {
    this.faceDetection = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.faceDetection = new FaceDetection({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
        }
      });

      this.faceDetection.setOptions({
        modelSelection: 0, // 0 for short-range (within 2 meters), 1 for full-range
        minDetectionConfidence: 0.5
      });

      await this.faceDetection.initialize();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize face detection:', error);
      throw error;
    }
  }

  async detectFaces(imageFile) {
    try {
      await this.initialize();

      // Convert file to image element
      const img = await this.fileToImage(imageFile);
      
      // Run face detection
      const detections = await this.faceDetection.send({ image: img });
      
      return this.formatDetections(detections, img.width, img.height);
    } catch (error) {
      console.error('Face detection failed:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  }

  async detectFacesFromCanvas(canvas) {
    try {
      await this.initialize();
      const detections = await this.faceDetection.send({ image: canvas });
      return this.formatDetections(detections, canvas.width, canvas.height);
    } catch (error) {
      console.error('Face detection from canvas failed:', error);
      return [];
    }
  }

  formatDetections(detections, imageWidth, imageHeight) {
    if (!detections || !detections.detections) return [];

    return detections.detections.map(detection => {
      const bbox = detection.boundingBox;
      return {
        confidence: detection.score?.[0] || 0,
        boundingBox: {
          x: bbox.xCenter - bbox.width / 2,
          y: bbox.yCenter - bbox.height / 2,
          width: bbox.width,
          height: bbox.height,
          // Normalized coordinates (0-1)
          normalized: {
            x: (bbox.xCenter - bbox.width / 2) / imageWidth,
            y: (bbox.yCenter - bbox.height / 2) / imageHeight,
            width: bbox.width / imageWidth,
            height: bbox.height / imageHeight
          }
        },
        landmarks: detection.keypoints || []
      };
    });
  }

  async fileToImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  // Blur faces in an image
  async blurFaces(imageFile, detections) {
    const img = await this.fileToImage(imageFile);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Apply blur to each detected face
    detections.forEach(detection => {
      const { x, y, width, height } = detection.boundingBox;
      
      // Get image data for the face region
      const imageData = ctx.getImageData(x, y, width, height);
      
      // Apply blur (simple box blur)
      const blurred = this.applyBoxBlur(imageData, 10);
      
      // Put blurred data back
      ctx.putImageData(blurred, x, y);
    });

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });
  }

  applyBoxBlur(imageData, radius) {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(pixels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        // Sample surrounding pixels
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              r += pixels[idx];
              g += pixels[idx + 1];
              b += pixels[idx + 2];
              a += pixels[idx + 3];
              count++;
            }
          }
        }

        // Average the colors
        const idx = (y * width + x) * 4;
        output[idx] = r / count;
        output[idx + 1] = g / count;
        output[idx + 2] = b / count;
        output[idx + 3] = a / count;
      }
    }

    return new ImageData(output, width, height);
  }

  // Get face count from detections
  getFaceCount(detections) {
    return detections.length;
  }

  // Check if faces are detected
  hasFaces(detections) {
    return detections.length > 0;
  }

  // Clean up resources
  destroy() {
    if (this.faceDetection) {
      this.faceDetection.close();
      this.faceDetection = null;
      this.isInitialized = false;
    }
  }
}

export const faceDetection = new FaceDetectionService();