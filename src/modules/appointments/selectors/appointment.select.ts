import { Prisma } from '@prisma/client';

export function appointmentSelect() {
  return {
    id: true,
    patientId: true,
    createdById: true,
    treatmentSessionId: true,
    confirmedById: true,
    cancelledById: true,
    rescheduledById: true,
    type: true,
    scheduledAt: true,
    durationMinutes: true,
    status: true,
    isWaiting: true,
    reasonForVisit: true,
    chatbotSummary: true,
    notes: true,
    confirmedAt: true,
    cancellationReason: true,
    cancelledAt: true,
    rescheduledAt: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.AppointmentSelect;
}

export type RawAppointment = Prisma.AppointmentGetPayload<{
  select: ReturnType<typeof appointmentSelect>;
}>;
