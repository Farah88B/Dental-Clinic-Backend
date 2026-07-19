import { Prisma } from '@prisma/client';

export const accountSelect = () => {
  return Prisma.validator<Prisma.AccountSelect>()({
    id: true,
    phone: true,
    status: true,
    biometricEnabled: true,
    phoneVerifiedAt: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
    roles: {
      select: {
        role: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      },
    },
  });
};

export type RawAccountSelect = Prisma.AccountGetPayload<{
  select: ReturnType<typeof accountSelect>;
}>;