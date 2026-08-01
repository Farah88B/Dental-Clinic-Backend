import { MediaFileCategory } from '@prisma/client';
import {
  MEDIA_CATEGORY_DIRECTORIES,
  MEDIA_PUBLIC_PATH_DEFAULT,
} from '../config/media.config';

export function getCategoryDirectory(category: MediaFileCategory): string {
  return MEDIA_CATEGORY_DIRECTORIES[category];
}

export function buildRelativeMediaPath(
  category: MediaFileCategory,
  storedName: string,
): string {
  return `${getCategoryDirectory(category)}/${storedName}`;
}

export function buildPublicMediaUrl(
  relativePath: string,
  publicPath: string = MEDIA_PUBLIC_PATH_DEFAULT,
): string {
  const normalizedPublic = publicPath.replace(/\/+$/, '');
  const normalizedRelative = relativePath.replace(/^\/+/, '');
  return `${normalizedPublic}/${normalizedRelative}`;
}
