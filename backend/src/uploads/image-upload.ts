import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request: Express.Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new BadRequestException('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
      return;
    }
    callback(null, true);
  },
};

export const multiImageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (_request: Express.Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new BadRequestException('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
      return;
    }
    callback(null, true);
  },
};

