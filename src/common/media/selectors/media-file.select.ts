import { Prisma } from '@prisma/client';

export const mediaFileSelect = () => {
  return Prisma.validator<Prisma.MediaFileSelect>()({
    id: true,
    originalName: true,
    storedName: true,
    path: true,
    mimeType: true,
    size: true,
    category: true,
    uploadedByAccountId: true,
    createdAt: true,
  });
};

export type RawMediaFile = Prisma.MediaFileGetPayload<{
  select: ReturnType<typeof mediaFileSelect>;
}>;
