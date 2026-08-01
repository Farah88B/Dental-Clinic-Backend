import { mkdir } from 'fs/promises';

export async function ensureDirectoryExists(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}
