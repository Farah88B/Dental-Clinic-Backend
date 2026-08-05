import { AppointmentStatus, TreatmentSessionStatus } from '@prisma/client';

/** Appointment statuses that block booking another appointment for the session. */
export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.PENDING_CONFIRMATION,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_TREATMENT,
] as const;

/**
 * Appointment statuses that mark the linked session as BOOKED
 * (and that allow canTreat when session is BOOKED).
 */
export const APPOINTMENT_STATUSES_THAT_BOOK_SESSION: readonly AppointmentStatus[] =
  [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.IN_TREATMENT,
  ] as const;

/** Appointment statuses that satisfy canTreat (session already BOOKED). */
export const APPOINTMENT_STATUSES_FOR_CAN_TREAT: readonly AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
] as const;

export type SessionOrderStatus = {
  id: number;
  sessionOrder: number;
  status: TreatmentSessionStatus;
};

/**
 * Next PENDING session after the last COMPLETED in the plan
 * (lowest sessionOrder among PENDING sessions still waiting for booking).
 * BOOKED / IN_TREATMENT sessions are skipped — they already have appointments.
 */
export function resolveNextBookableSessionId(
  planSessions: SessionOrderStatus[],
): number | null {
  const nonCancelled = planSessions.filter(
    (s) => s.status !== TreatmentSessionStatus.CANCELLED,
  );

  const completedOrders = nonCancelled
    .filter((s) => s.status === TreatmentSessionStatus.COMPLETED)
    .map((s) => s.sessionOrder);

  const lastCompletedOrder =
    completedOrders.length > 0 ? Math.max(...completedOrders) : 0;

  const candidates = nonCancelled
    .filter(
      (s) =>
        s.status === TreatmentSessionStatus.PENDING &&
        s.sessionOrder > lastCompletedOrder,
    )
    .sort((a, b) => a.sessionOrder - b.sessionOrder);

  return candidates[0]?.id ?? null;
}

/**
 * canBook: PENDING + next after last completed + no active linked appointment.
 * Not gated on availableForBookingAt.
 */
export function computeCanBook(
  session: { id: number; status: TreatmentSessionStatus },
  planSessions: SessionOrderStatus[],
  hasActiveAppointment: boolean,
): boolean {
  if (session.status !== TreatmentSessionStatus.PENDING) {
    return false;
  }
  if (hasActiveAppointment) {
    return false;
  }
  return resolveNextBookableSessionId(planSessions) === session.id;
}

/**
 * canTreat: BOOKED + linked appointment in CONFIRMED | CHECKED_IN.
 * Not gated on scheduledAt or check-in-only.
 */
export function computeCanTreat(
  session: { status: TreatmentSessionStatus },
  appointment: { status: AppointmentStatus } | null,
): boolean {
  if (session.status !== TreatmentSessionStatus.BOOKED) {
    return false;
  }
  if (!appointment) {
    return false;
  }
  return (
    APPOINTMENT_STATUSES_FOR_CAN_TREAT as readonly AppointmentStatus[]
  ).includes(appointment.status);
}
