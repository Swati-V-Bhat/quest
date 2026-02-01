// lib/imageService.ts - Simplified single image upload

import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

// Check if browser supports WebP
const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

/**
 * Compress and upload a single optimized image
 * Returns a single URL string
 */
export const compressAndUploadImage = async (
  file: File,
  path: string,
  uid: string
): Promise<string> => {
  const timestamp = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
  const format = supportsWebP() ? 'image/webp' : 'image/jpeg';
  const extension = supportsWebP() ? 'webp' : 'jpg';

  // Single optimized compression - good quality, reasonable size
  const options = {
    maxSizeMB: 0.5,              // 500KB max
    maxWidthOrHeight: 1920,      // Full HD
    useWebWorker: true,
    fileType: format,
    initialQuality: 0.85         // High quality
  };

  const compressedFile = await imageCompression(file, options);

  console.log('Compression:', {
    original: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    compressed: `${(compressedFile.size / 1024).toFixed(2)} KB`,
    saved: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
  });

  const storageRef = ref(
    storage,
    `${path}/${uid}/${timestamp}_${baseName}.${extension}`
  );

  await uploadBytes(storageRef, compressedFile);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
};

/**
 * Generate thumbnail for preview
 */
export const generateThumbnail = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.1,
    maxWidthOrHeight: 400,
    useWebWorker: true,
    fileType: supportsWebP() ? 'image/webp' : 'image/jpeg'
  };
  return await imageCompression(file, options);
};

/**
 * Process image to 4:5 aspect ratio
 * Returns a blob ready for upload
 */
export const processImageTo4x5 = (
  file: File,
  mode: 'crop' | 'fit' = 'crop'
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        const targetRatio = 4 / 5; // 0.8
        const imgRatio = img.width / img.height;

        let canvasWidth: number, canvasHeight: number;
        let sourceX = 0, sourceY = 0;
        let sourceWidth = img.width, sourceHeight = img.height;

        const maxWidth = 1080;
        const maxHeight = 1350;

        if (mode === 'crop') {
          // CROP MODE: Cut parts of image to fit 4:5
          if (imgRatio > targetRatio) {
            // Image is wider - crop sides
            sourceWidth = img.height * targetRatio;
            sourceX = (img.width - sourceWidth) / 2;
          } else {
            // Image is taller - crop top/bottom
            sourceHeight = img.width / targetRatio;
            sourceY = (img.height - sourceHeight) / 2;
          }

          // Set canvas to exact 4:5 ratio
          if (sourceWidth > maxWidth) {
            canvasWidth = maxWidth;
            canvasHeight = maxHeight;
          } else {
            canvasWidth = sourceWidth;
            canvasHeight = sourceHeight;
          }

          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          // Draw cropped image
          ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, canvasWidth, canvasHeight
          );

        } else {
          // FIT MODE: Add black bars to maintain 4:5
          if (imgRatio > targetRatio) {
            // Image is wider - fit to width
            canvasWidth = Math.min(img.width, maxWidth);
            canvasHeight = canvasWidth / targetRatio;
          } else {
            // Image is taller - fit to height
            canvasHeight = Math.min(img.height, maxHeight);
            canvasWidth = canvasHeight * targetRatio;
          }

          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          // Fill with black background
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // Calculate position to center image
          const scale = Math.min(
            canvasWidth / img.width,
            canvasHeight / img.height
          );
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (canvasWidth - scaledWidth) / 2;
          const y = (canvasHeight - scaledHeight) / 2;

          // Draw fitted image
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        }

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          supportsWebP() ? 'image/webp' : 'image/jpeg',
          0.92
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Get optimized image URL (Firebase Storage uses CDN automatically)
 */
export const getOptimizedImageUrl = (
  firebaseUrl: string | string[] | undefined,
  size?: 'thumb' | 'medium' | 'full'
): string => {
  // Handle array of URLs (take first)
  if (Array.isArray(firebaseUrl)) {
    firebaseUrl = firebaseUrl[0];
  }

  // Handle undefined/null
  if (!firebaseUrl) {
    return '/default-image.png';
  }

  // Firebase Storage URLs automatically use Google CDN
  // No modification needed - CDN is built-in!

  // Future: Add size-based thumbnail URLs when Cloud Function is ready
  // if (size === 'thumb') return firebaseUrl.replace('.webp', '_thumb_150.webp');
  // if (size === 'medium') return firebaseUrl.replace('.webp', '_thumb_300.webp');

  return firebaseUrl;
};

/**
 * Check if URL is from Firebase Storage (uses CDN)
 */
export const isFirebaseStorageUrl = (url: string): boolean => {
  return url.includes('firebasestorage.googleapis.com');
};

/**
 * Preload critical images for faster rendering
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Batch preload multiple images
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(urls.map(url => preloadImage(url)));
};