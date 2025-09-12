import sharp from 'sharp';
import { PassThrough, Readable } from 'stream';

export interface FileOptimizationConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  progressive?: boolean;
  stripMetadata?: boolean;
}

export interface OptimizationResult {
  buffer: Buffer;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  width?: number;
  height?: number;
}

export class FileOptimizer {
  private static readonly DEFAULT_CONFIG: FileOptimizationConfig = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'webp',
    progressive: true,
    stripMetadata: true,
  };

  /**
   * Optimize an image buffer with compression and resizing
   */
  static async optimizeImage(
    buffer: Buffer,
    config: FileOptimizationConfig = {}
  ): Promise<OptimizationResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const originalSize = buffer.length;

    try {
      let sharpInstance = sharp(buffer);

      // Get original metadata
      const metadata = await sharpInstance.metadata();
      
      // Resize if necessary
      if (
        finalConfig.maxWidth ||
        finalConfig.maxHeight ||
        (metadata.width && metadata.width > (finalConfig.maxWidth || 1920)) ||
        (metadata.height && metadata.height > (finalConfig.maxHeight || 1080))
      ) {
        sharpInstance = sharpInstance.resize(
          finalConfig.maxWidth,
          finalConfig.maxHeight,
          {
            fit: 'inside',
            withoutEnlargement: true,
          }
        );
      }

      // Strip metadata if requested
      if (finalConfig.stripMetadata) {
        sharpInstance = sharpInstance.rotate(); // Auto-rotate based on EXIF
      }

      // Apply format and quality settings
      switch (finalConfig.format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: finalConfig.quality,
            progressive: finalConfig.progressive,
            mozjpeg: true, // Better compression
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            compressionLevel: 9,
            progressive: finalConfig.progressive,
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: finalConfig.quality,
            effort: 6, // Max compression effort
          });
          break;
        case 'avif':
          sharpInstance = sharpInstance.avif({
            quality: finalConfig.quality,
            effort: 9, // Max compression effort
          });
          break;
      }

      const optimizedBuffer = await sharpInstance.toBuffer({ resolveWithObject: true });
      
      return {
        buffer: optimizedBuffer.data,
        originalSize,
        optimizedSize: optimizedBuffer.data.length,
        compressionRatio: ((originalSize - optimizedBuffer.data.length) / originalSize) * 100,
        format: finalConfig.format || 'webp',
        width: optimizedBuffer.info.width,
        height: optimizedBuffer.info.height,
      };
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw new Error('Failed to optimize image');
    }
  }

  /**
   * Generate multiple sizes of an image (thumbnail, medium, large)
   */
  static async generateImageSizes(
    buffer: Buffer,
    sizes: { name: string; width: number; height?: number; quality?: number }[]
  ): Promise<Record<string, OptimizationResult>> {
    const results: Record<string, OptimizationResult> = {};

    for (const size of sizes) {
      const config: FileOptimizationConfig = {
        maxWidth: size.width,
        maxHeight: size.height,
        quality: size.quality || 80,
        format: 'webp',
      };

      results[size.name] = await this.optimizeImage(buffer, config);
    }

    return results;
  }

  /**
   * Validate file type and size
   */
  static validateFile(
    buffer: Buffer,
    allowedTypes: string[],
    maxSize: number
  ): { valid: boolean; error?: string; mimeType?: string } {
    if (buffer.length > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    // Detect file type from buffer
    const mimeType = this.detectMimeType(buffer);
    
    if (!mimeType || !allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    return { valid: true, mimeType };
  }

  /**
   * Detect MIME type from buffer
   */
  private static detectMimeType(buffer: Buffer): string | null {
    // Check for common image signatures
    if (buffer.length < 12) return null;

    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    // WebP
    if (
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // PDF
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return 'application/pdf';
    }

    // SVG (simplified check)
    const svgStart = buffer.slice(0, 100).toString('utf8').toLowerCase();
    if (svgStart.includes('<svg') || svgStart.includes('<?xml')) {
      return 'image/svg+xml';
    }

    return null;
  }

  /**
   * Create a streaming image optimizer for large files
   */
  static createImageOptimizationStream(
    config: FileOptimizationConfig = {}
  ): PassThrough {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on('data', (chunk) => {
      chunks.push(chunk);
    });

    passThrough.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const result = await this.optimizeImage(buffer, finalConfig);
        
        // Create a readable stream from the optimized buffer
        const readable = new Readable({
          read() {
            this.push(result.buffer);
            this.push(null);
          },
        });

        readable.pipe(passThrough);
      } catch (error) {
        passThrough.emit('error', error);
      }
    });

    return passThrough;
  }
}

// Utility functions for common use cases
export async function optimizeProfileImage(buffer: Buffer): Promise<OptimizationResult> {
  return FileOptimizer.optimizeImage(buffer, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 85,
    format: 'webp',
  });
}

export async function optimizeTaskAttachment(buffer: Buffer): Promise<OptimizationResult> {
  return FileOptimizer.optimizeImage(buffer, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'webp',
  });
}

export async function generateThumbnails(buffer: Buffer): Promise<Record<string, OptimizationResult>> {
  return FileOptimizer.generateImageSizes(buffer, [
    { name: 'thumbnail', width: 150, height: 150, quality: 75 },
    { name: 'medium', width: 600, height: 400, quality: 80 },
    { name: 'large', width: 1200, height: 800, quality: 85 },
  ]);
}

// File type constants
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 50 * 1024 * 1024, // 50MB
  avatar: 5 * 1024 * 1024, // 5MB
} as const;