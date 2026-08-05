import * as fs from 'fs';
import * as path from 'path';
import {
  ContentStatus,
  ContentType,
  MediaFileCategory,
} from '@prisma/client';
import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import CONTENT_DATA from './content.data.json';

/**
 * Seeds published/draft content for patient app CMS QA.
 * Idempotent via findFirst on titleEn.
 * Registers real files from uploads/content/demo-content-N.jpg when present.
 */
export async function upsertDemoContent(prisma: PrismaService) {
  const doctor = await prisma.account.findUnique({
    where: { phone: '0999999999' },
  });

  const uploadRoot = path.resolve(
    process.cwd(),
    process.env.MEDIA_UPLOAD_ROOT ?? 'uploads',
  );

  for (const item of CONTENT_DATA) {
    let content = await prisma.content.findFirst({
      where: { titleEn: item.titleEn },
    });
    if (!content) {
      content = await prisma.content.create({
        data: {
          type: item.type as ContentType,
          status: item.status as ContentStatus,
          titleAr: item.titleAr,
          titleEn: item.titleEn,
          bodyAr: item.bodyAr,
          bodyEn: item.bodyEn,
          createdByAccountId: doctor?.id,
        },
      });
    }

    const imageCount = item.imageCount ?? 0;
    for (let i = 0; i < imageCount; i++) {
      const relativePath = `content/demo-content-${i + 1}.jpg`;
      const abs = path.join(uploadRoot, relativePath);
      if (!fs.existsSync(abs)) {
        console.warn(`[seed] missing ${relativePath} — skip content media`);
        continue;
      }

      const existingLink = await prisma.contentMediaFile.findFirst({
        where: {
          contentId: content.id,
          mediaFile: { path: relativePath },
        },
      });
      if (existingLink) continue;

      let media = await prisma.mediaFile.findFirst({
        where: { path: relativePath },
      });
      if (!media) {
        const stat = fs.statSync(abs);
        const storedName = path.basename(relativePath);
        media = await prisma.mediaFile.create({
          data: {
            originalName: storedName,
            storedName,
            path: relativePath,
            mimeType: 'image/jpeg',
            size: stat.size,
            category: MediaFileCategory.CONTENT_IMAGE,
            uploadedByAccountId: doctor?.id,
          },
        });
      }

      await prisma.contentMediaFile.create({
        data: {
          contentId: content.id,
          mediaFileId: media.id,
          displayOrder: i,
        },
      });
    }
  }
}
