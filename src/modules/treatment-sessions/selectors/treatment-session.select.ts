import { Prisma } from '@prisma/client';

export const treatmentSessionSelect = () => {
  return Prisma.validator<Prisma.TreatmentSessionSelect>()({
    id: true,
    treatmentPlanId: true,
    titleAr: true,
    titleEn: true,
    sessionOrder: true,
    durationMinutes: true,
    minDaysBeforeBooking: true,
    estimatedCost: true,
    actualCost: true,
    availableForBookingAt: true,
    status: true,
    completedAt: true,
    rating: true,
    ratedAt: true,
    createdAt: true,
    updatedAt: true,
  });
};

export type RawTreatmentSessionSelect = Prisma.TreatmentSessionGetPayload<{
  select: ReturnType<typeof treatmentSessionSelect>;
}>;
