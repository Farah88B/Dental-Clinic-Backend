import { Prisma } from '@prisma/client';

export const clinicWorkingHoursSelect = () => {
  return Prisma.validator<Prisma.ClinicWorkingHoursSelect>()({
    id: true,
    dayOfWeek: true,
    isWorkingDay: true,
    startMinute: true,
    endMinute: true,
    breaks: true,
    updatedAt: true,
  });
};

export type RawClinicWorkingHours = Prisma.ClinicWorkingHoursGetPayload<{
  select: ReturnType<typeof clinicWorkingHoursSelect>;
}>;

export const clinicScheduleExceptionSelect = () => {
  return Prisma.validator<Prisma.ClinicScheduleExceptionSelect>()({
    id: true,
    date: true,
    isWorkingDay: true,
    startMinute: true,
    endMinute: true,
    breaks: true,
    reason: true,
    createdAt: true,
    updatedAt: true,
  });
};

export type RawClinicScheduleException =
  Prisma.ClinicScheduleExceptionGetPayload<{
    select: ReturnType<typeof clinicScheduleExceptionSelect>;
  }>;
