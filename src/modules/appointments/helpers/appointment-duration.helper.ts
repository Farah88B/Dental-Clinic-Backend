import { AppointmentType } from '@prisma/client';

export function resolveAppointmentDurationMinutes(input: {
  type: AppointmentType;
  sessionDurationMinutes: number | null | undefined;
  defaultConsultationDurationMinutes: number;
}): number {
  if (
    input.type === AppointmentType.FOLLOW_UP &&
    typeof input.sessionDurationMinutes === 'number' &&
    input.sessionDurationMinutes > 0
  ) {
    return input.sessionDurationMinutes;
  }
  return input.defaultConsultationDurationMinutes;
}
