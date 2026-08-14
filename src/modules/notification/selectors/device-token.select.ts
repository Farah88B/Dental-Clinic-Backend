import { Prisma } from '@prisma/client';

export const deviceTokenSelect = {
  id: true,
  accountId: true,
  token: true,
  platform: true,
  userAgent: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeviceTokenSelect;

export type RawDeviceToken = Prisma.DeviceTokenGetPayload<{
  select: typeof deviceTokenSelect;
}>;
