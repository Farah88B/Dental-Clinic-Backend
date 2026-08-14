import { Prisma } from '@prisma/client';

export const notificationSelect = {
  id: true,
  accountId: true,
  type: true,
  titleAr: true,
  titleEn: true,
  bodyAr: true,
  bodyEn: true,
  data: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type RawNotification = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;
