import { Prisma } from '@prisma/client';

export const clinicSettingsSelect = () => {
  return Prisma.validator<Prisma.ClinicSettingsSelect>()({
    id: true,
    bufferTimeMinutes: true,
    cancelRescheduleWindowHours: true,
    defaultConsultationDurationMinutes: true,
    reminderLeadTimeHours: true,
    ratingValidityHours: true,
    autoConfirmationEnabled: true,
    onlineBookingEnabled: true,
    maxBookingHorizonDays: true,
    updatedAt: true,
  });
};

export type RawClinicSettings = Prisma.ClinicSettingsGetPayload<{
  select: ReturnType<typeof clinicSettingsSelect>;
}>;