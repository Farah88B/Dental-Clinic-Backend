import { BadRequestException } from '@nestjs/common';
import { MediaFileCategory } from '@prisma/client';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { resolve } from 'path';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import {
  MEDIA_CATEGORY_MAX_SIZE,
  MEDIA_CATEGORY_MIME_TYPES,
  MEDIA_UPLOAD_ROOT_DEFAULT,
} from './media.config';
import { ensureDirectoryExists } from '../helpers/media-directory.helper';
import { generateStoredFileName } from '../helpers/media-filename.helper';
import { getCategoryDirectory } from '../helpers/media-path.helper';

export function createMediaMulterOptions(
  category: MediaFileCategory,
  options?: { maxFiles?: number },
): MulterOptions {
  const uploadRoot = resolve(
    process.cwd(),
    process.env.MEDIA_UPLOAD_ROOT ?? MEDIA_UPLOAD_ROOT_DEFAULT,
  );
  const allowedMimeTypes = MEDIA_CATEGORY_MIME_TYPES[category];
  const maxSize = MEDIA_CATEGORY_MAX_SIZE[category];

  return {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        const directory = resolve(uploadRoot, getCategoryDirectory(category));
        ensureDirectoryExists(directory)
          .then(() => callback(null, directory))
          .catch((error: Error) => callback(error, directory));
      },
      filename: (_req, file, callback) => {
        callback(null, generateStoredFileName(file.originalname));
      },
    }),
    limits: {
      fileSize: maxSize,
      files: options?.maxFiles ?? 1,
    },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(
          new BadRequestException(ERROR_CODES.MEDIA_INVALID_FILE_TYPE) as Error,
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}
