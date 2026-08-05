import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaFileCategory } from '@prisma/client';
import { access, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import {
  MEDIA_CATEGORY_DIRECTORIES,
  MEDIA_PUBLIC_PATH_DEFAULT,
  MEDIA_UPLOAD_ROOT_DEFAULT,
} from '../config/media.config';
import { ensureDirectoryExists } from '../helpers/media-directory.helper';
import { buildPublicMediaUrl } from '../helpers/media-path.helper';
import { MediaStorageDriver } from '../interfaces/media-storage-driver.interface';

@Injectable()
export class LocalMediaStorageService
  implements MediaStorageDriver, OnModuleInit
{
  private readonly uploadRoot: string;
  private readonly publicPath: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadRoot = resolve(
      process.cwd(),
      this.configService.get<string>('media.uploadRoot') ??
        MEDIA_UPLOAD_ROOT_DEFAULT,
    );
    this.publicPath =
      this.configService.get<string>('media.publicPath') ??
      MEDIA_PUBLIC_PATH_DEFAULT;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureReady();
  }

  async ensureReady(): Promise<void> {
    await ensureDirectoryExists(this.uploadRoot);

    await Promise.all(
      Object.values(MEDIA_CATEGORY_DIRECTORIES).map((directory) =>
        ensureDirectoryExists(join(this.uploadRoot, directory)),
      ),
    );
  }

  getAbsolutePath(relativePath: string): string {
    return join(this.uploadRoot, relativePath.replace(/^\/+/, ''));
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await access(this.getAbsolutePath(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async delete(relativePath: string): Promise<void> {
    try {
      await unlink(this.getAbsolutePath(relativePath));
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code?: string }).code
          : undefined;
      if (code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getPublicUrl(relativePath: string): string {
    return buildPublicMediaUrl(relativePath, this.publicPath);
  }

  getUploadRoot(): string {
    return this.uploadRoot;
  }

  getCategoryAbsoluteDirectory(category: MediaFileCategory): string {
    return join(this.uploadRoot, MEDIA_CATEGORY_DIRECTORIES[category]);
  }
}
