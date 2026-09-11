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
}
