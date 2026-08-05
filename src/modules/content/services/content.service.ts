import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, MediaFileCategory, Prisma } from '@prisma/client';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { MediaService } from 'src/common/media/services/media.service';
import { toUiLanguage } from 'src/common/i18n/localize.helper';
import { ContentAdapter } from '../adapter/content.adapter';
import { contentSelect } from '../selectors/content.select';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentAdapter: ContentAdapter,
    private readonly mediaService: MediaService,
  ) {}

  async listStaff(pagination: PaginationDto, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        select: contentSelect(),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.content.count(),
    ]);
    return new AdminListDto(
      await this.contentAdapter.fromArray(items, language),
      total,
    );
  }

  async listPublished(pagination: PaginationDto, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const where: Prisma.ContentWhereInput = { status: ContentStatus.PUBLISHED };
    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        select: contentSelect(),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.content.count({ where }),
    ]);
    return new AdminListDto(
      await this.contentAdapter.fromArray(items, language),
      total,
    );
  }

  async getByIdStaff(id: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const content = await this.prisma.content.findUniqueOrThrow({
      where: { id },
      select: contentSelect(),
    });
    return this.contentAdapter.adapt(content, language);
  }

  async getPublishedById(id: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const content = await this.prisma.content.findFirst({
      where: { id, status: ContentStatus.PUBLISHED },
      select: contentSelect(),
    });
    if (!content) {
      throw new NotFoundException();
    }
    return this.contentAdapter.adapt(content, language);
  }

  async create(
    dto: CreateContentDto,
    createdByAccountId: number,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const content = await this.prisma.content.create({
      data: {
        type: dto.type,
        status: dto.status ?? ContentStatus.DRAFT,
        titleAr: dto.titleAr,
        titleEn: dto.titleEn,
        bodyAr: dto.bodyAr,
        bodyEn: dto.bodyEn,
        createdByAccountId,
      },
      select: contentSelect(),
    });
    return this.contentAdapter.adapt(content, language);
  }

  async update(
    id: number,
    dto: UpdateContentDto,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const content = await this.prisma.content.update({
      where: { id },
      data: dto,
      select: contentSelect(),
    });
    return this.contentAdapter.adapt(content, language);
  }

  async archive(id: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const content = await this.prisma.content.update({
      where: { id },
      data: { status: ContentStatus.ARCHIVED },
      select: contentSelect(),
    });
    return this.contentAdapter.adapt(content, language);
  }

  async addMedia(
    contentId: number,
    file: Express.Multer.File,
    uploadedByAccountId: number,
    preferredLanguage?: string,
  ) {
    await this.prisma.content.findUniqueOrThrow({ where: { id: contentId } });

    const media = await this.mediaService.save(
      file,
      MediaFileCategory.CONTENT_IMAGE,
      uploadedByAccountId,
    );

    const maxOrder = await this.prisma.contentMediaFile.aggregate({
      where: { contentId },
      _max: { displayOrder: true },
    });

    await this.prisma.contentMediaFile.create({
      data: {
        contentId,
        mediaFileId: media.id,
        displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
      },
    });

    return this.getByIdStaff(contentId, preferredLanguage);
  }

  async removeMedia(contentId: number, mediaFileId: number): Promise<void> {
    const link = await this.prisma.contentMediaFile.findFirst({
      where: { contentId, mediaFileId },
    });
    if (!link) {
      throw new NotFoundException();
    }
    await this.prisma.contentMediaFile.delete({ where: { id: link.id } });
    await this.mediaService.delete(mediaFileId);
  }
}
