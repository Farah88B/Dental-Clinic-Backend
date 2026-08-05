import { MediaFileCategory } from '@prisma/client';

/**
 * Relative subdirectory (under the uploads root) per media category.
 * Stored `path` values are like `profiles/abc123.jpg` — never include the root.
 */
export const MEDIA_CATEGORY_DIRECTORIES: Record<MediaFileCategory, string> = {
  PROFILE_IMAGE: 'profiles',
  XRAY: 'xrays',
  REPORT: 'reports',
  PRESCRIPTION: 'prescriptions',
  CONTENT_IMAGE: 'content',
  OTHER: 'other',
};

export const MEDIA_UPLOAD_ROOT_ENV = 'MEDIA_UPLOAD_ROOT';
export const MEDIA_UPLOAD_ROOT_DEFAULT = 'uploads';
export const MEDIA_PUBLIC_PATH_DEFAULT = '/uploads';

/** Max file size in bytes per category */
export const MEDIA_CATEGORY_MAX_SIZE: Record<MediaFileCategory, number> = {
  PROFILE_IMAGE: 5 * 1024 * 1024, // 5 MB
  XRAY: 20 * 1024 * 1024, // 20 MB
  REPORT: 15 * 1024 * 1024, // 15 MB
  PRESCRIPTION: 10 * 1024 * 1024, // 10 MB
  CONTENT_IMAGE: 8 * 1024 * 1024, // 8 MB
  OTHER: 20 * 1024 * 1024, // 20 MB
};

export const MEDIA_CATEGORY_MIME_TYPES: Record<MediaFileCategory, string[]> = {
  PROFILE_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  XRAY: ['image/jpeg', 'image/png', 'image/webp', 'application/dicom'],
  REPORT: ['application/pdf', 'image/jpeg', 'image/png'],
  PRESCRIPTION: ['application/pdf', 'image/jpeg', 'image/png'],
  CONTENT_IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  OTHER: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
};
