import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaFileCategory } from '@prisma/client';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { MediaFileAdapter } from '../adapter/media-file.adapter';
import { MediaFileResponseDto } from '../dto/media-file-response.dto';
import { sanitizeOriginalFileName } from '../helpers/media-filename.helper';
import { buildRelativeMediaPath } from '../helpers/media-path.helper';
import {
  MEDIA_STORAGE_DRIVER,
  type MediaStorageDriver,
} from '../interfaces/media-storage-driver.interface';
import { mediaFileSelect } from '../selectors/media-file.select';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaFileAdapter: MediaFileAdapter,
    @Inject(MEDIA_STORAGE_DRIVER)
    private readonly storage: MediaStorageDriver,
  ) {}

  async findById(id: number): Promise<MediaFileResponseDto> {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id },
      select: mediaFileSelect(),
    });

    if (!mediaFile) {
      throw new NotFoundException(ERROR_CODES.MEDIA_FILE_NOT_FOUND);
    }

    return this.mediaFileAdapter.adapt(mediaFile);
  }

  /**
   * Persists metadata for a file already written by Multer disk storage.
   */
  async save(
    file: Express.Multer.File,
    category: MediaFileCategory,
    uploadedByAccountId?: number | null,
  ): Promise<MediaFileResponseDto> {
    if (!file) {
      throw new BadRequestException(ERROR_CODES.MEDIA_FILE_REQUIRED);
    }

    const storedName = file.filename;
    const relativePath = buildRelativeMediaPath(category, storedName);

    try {
      const mediaFile = await this.prisma.mediaFile.create({
        data: {
          originalName: sanitizeOriginalFileName(file.originalname),
          storedName,
          path: relativePath,
          mimeType: file.mimetype,
          size: file.size,
          category,
          uploadedByAccountId: uploadedByAccountId ?? null,
        },
        select: mediaFileSelect(),
      });

      return this.mediaFileAdapter.adapt(mediaFile);
    } catch (error) {
      await this.storage.delete(relativePath);
      throw error;
    }
  }

  async delete(mediaFileId: number): Promise<void> {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
      select: { id: true, path: true },
    });

    if (!mediaFile) {
      throw new NotFoundException(ERROR_CODES.MEDIA_FILE_NOT_FOUND);
    }

    await this.prisma.mediaFile.delete({
      where: { id: mediaFileId },
    });

    await this.storage.delete(mediaFile.path);
  }

  getPublicUrl(relativePath: string): string {
    return this.storage.getPublicUrl(relativePath);
  }
}
