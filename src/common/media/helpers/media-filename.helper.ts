import { randomUUID } from 'crypto';
import { extname } from 'path';

export function sanitizeOriginalFileName(originalName: string): string {
  return originalName.trim();
}

export function getFileExtension(originalName: string): string {
  const extension = extname(originalName).toLowerCase();
  return extension.startsWith('.') ? extension : '';
}

export function generateStoredFileName(originalName: string): string {
  const extension = getFileExtension(originalName);
  return `${randomUUID()}${extension}`;
}
