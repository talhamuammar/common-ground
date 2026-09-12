import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'wxj2nmah',
      api_key: process.env.CLOUDINARY_API_KEY || '782965997591425',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'aB-hhkYHzdNAkFc-HIBhWcTP-pk',
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'social-app'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload error', error);
            return reject(error || new Error('Cloudinary upload failed'));
          }
          resolve(result.secure_url);
        },
      );

      if (file.buffer) {
        uploadStream.end(file.buffer);
      } else {
        reject(new Error('No file buffer provided for Cloudinary upload'));
      }
    });
  }

  /**
   * Extracts the public_id from a Cloudinary URL or returns the string if already a public_id.
   * Handles versions (v123...), transformations (c_fill, w_300...), folders, and extensions.
   * Example: https://res.cloudinary.com/wxj2nmah/image/upload/v1789173697/social-app/posts/mstvrogloetv80hk0otc.png
   * Result: social-app/posts/mstvrogloetv80hk0otc
   */
  extractPublicId(urlOrPublicId: string): string | null {
    if (!urlOrPublicId || typeof urlOrPublicId !== 'string') return null;
    const trimmed = urlOrPublicId.trim();
    if (!trimmed) return null;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return trimmed;
    }

    if (!trimmed.includes('cloudinary.com')) {
      return null;
    }

    try {
      const parts = trimmed.split('/upload/');
      if (parts.length < 2) return null;

      const path = parts[1];
      const segments = path.split('/');
      const cleanSegments: string[] = [];
      let foundVersionOrFolder = false;

      for (const seg of segments) {
        if (!foundVersionOrFolder) {
          // Skip version segment: v1234567890
          if (/^v\d+$/.test(seg)) {
            foundVersionOrFolder = true;
            continue;
          }
          // Skip transformation segments (e.g. c_fill, w_300, q_auto, etc.)
          if (
            seg.includes(',') ||
            seg.startsWith('c_') ||
            seg.startsWith('w_') ||
            seg.startsWith('h_') ||
            seg.startsWith('q_') ||
            seg.startsWith('f_')
          ) {
            continue;
          }
        }
        cleanSegments.push(seg);
      }

      const fullPath = cleanSegments.join('/');
      // Strip extension and query parameters / hashes
      return fullPath.replace(/\.[^/.]+$/, '').split('?')[0].split('#')[0];
    } catch (e) {
      this.logger.error('Failed to extract public_id from URL', e);
      return null;
    }
  }

  /**
   * Deletes an image from Cloudinary by URL or public_id.
   */
  async deleteImage(urlOrPublicId: string): Promise<boolean> {
    const publicId = this.extractPublicId(urlOrPublicId);
    if (!publicId) return false;

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });
      this.logger.log(`Cloudinary destroy for "${publicId}": ${result?.result || 'ok'}`);
      return result?.result === 'ok';
    } catch (error) {
      this.logger.error(`Error deleting image from Cloudinary (${publicId})`, error);
      return false;
    }
  }

  /**
   * Deletes multiple images from Cloudinary by URLs or public_ids.
   */
  async deleteImages(urlsOrPublicIds: string[]): Promise<void> {
    if (!Array.isArray(urlsOrPublicIds) || urlsOrPublicIds.length === 0) return;
    const uniqueItems = Array.from(new Set(urlsOrPublicIds.filter(Boolean)));
    await Promise.allSettled(uniqueItems.map((item) => this.deleteImage(item)));
  }
}
