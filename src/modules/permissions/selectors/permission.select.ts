import { Prisma } from '@prisma/client';

export const permissionSelect = () => {
  return Prisma.validator<Prisma.PermissionSelect>()({
    id: true,
    code: true,
    nameAr: true,
    nameEn: true,
    order: true,
    descriptionAr: true,
    descriptionEn: true,
  });
};

export type RawPermissionSelect = Prisma.PermissionGetPayload<{
  select: ReturnType<typeof permissionSelect>;
}>;