import { Prisma } from '@prisma/client';

export const roleSelect = () => {
  return Prisma.validator<Prisma.RoleSelect>()({
    id: true,
    code: true,
    nameAr: true,
    nameEn: true,
    descriptionAr: true,
    descriptionEn: true,
    createdAt: true,
   permissions: {
  orderBy: {
    permission: {
      order: 'asc',
    },
  },
  select: {
    permission: {
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        order: true,
      },
    },
  },
},
  });
};

// Shape returned by Prisma when using roleSelect() above — used as the
// adapter's raw input type in the next stage.
export type RawRoleSelect = Prisma.RoleGetPayload<{ select: ReturnType<typeof roleSelect> }>;