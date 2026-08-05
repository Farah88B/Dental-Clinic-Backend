export interface MediaStorageDriver {
  ensureReady(): Promise<void>;
  getAbsolutePath(relativePath: string): string;
  exists(relativePath: string): Promise<boolean>;
  delete(relativePath: string): Promise<void>;
  getPublicUrl(relativePath: string): string;
}

export const MEDIA_STORAGE_DRIVER = Symbol('MEDIA_STORAGE_DRIVER');
