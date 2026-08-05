import { Prisma } from '@prisma/client';

export const treatmentSessionTemplateSelect = () => {
  return Prisma.validator<Prisma.TreatmentSessionTemplateSelect>()({
    id: true,
    planTemplateId: true,
    titleAr: true,
    titleEn: true,
    sessionOrder: true,
    durationMinutes: true,
    minDaysBeforeBooking: true,
    estimatedCost: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  });
};

export type RawTreatmentSessionTemplateSelect = Prisma.TreatmentSessionTemplateGetPayload<{
  select: ReturnType<typeof treatmentSessionTemplateSelect>;
}>;
