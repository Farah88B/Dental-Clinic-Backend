import { AppointmentStatus } from '@prisma/client';

export function resolveInitialAppointmentStatus(input: {
  source: 'APP' | 'DASHBOARD';
  autoConfirmationEnabled: boolean;
}): AppointmentStatus {
  if (input.source === 'DASHBOARD') {
    return AppointmentStatus.CONFIRMED;
  }
  return input.autoConfirmationEnabled
    ? AppointmentStatus.CONFIRMED
    : AppointmentStatus.PENDING_CONFIRMATION;
}
