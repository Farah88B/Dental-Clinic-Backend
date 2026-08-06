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
    checkedInById: true,
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
    checkedInAt: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.AppointmentSelect;
}

export type RawAppointment = Prisma.AppointmentGetPayload<{
  select: ReturnType<typeof appointmentSelect>;
}>;

const appointmentPatientSelect = {
  id: true,
  fullName: true,
  medicalRecordNumber: true,
} satisfies Prisma.PatientSelect;

export function appointmentListSelect() {
  return {
    ...appointmentSelect(),
    patient: { select: appointmentPatientSelect },
  } satisfies Prisma.AppointmentSelect;
}

export type RawAppointmentListItem = Prisma.AppointmentGetPayload<{
  select: ReturnType<typeof appointmentListSelect>;
}>;

export function appointmentDetailSelect() {
  return appointmentListSelect();
}

export type RawAppointmentDetail = RawAppointmentListItem;
