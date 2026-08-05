import { Prisma } from '@prisma/client';

export const contentSelect = () => {
  return Prisma.validator<Prisma.ContentSelect>()({
    id: true,
    type: true,
    status: true,
    titleAr: true,
    titleEn: true,
    bodyAr: true,
    bodyEn: true,
    createdByAccountId: true,
    createdAt: true,
    updatedAt: true,
    mediaFiles: {
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        displayOrder: true,
        mediaFileId: true,
        mediaFile: {
          select: {
            id: true,
            originalName: true,
            path: true,
            mimeType: true,
            category: true,
          },
        },
      },
    },
  });
};

export type RawContentSelect = Prisma.ContentGetPayload<{
  select: ReturnType<typeof contentSelect>;
}>;
