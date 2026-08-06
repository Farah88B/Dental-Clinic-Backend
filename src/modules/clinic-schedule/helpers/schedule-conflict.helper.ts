import { getFreeWindows } from './free-windows.helper';
import { ScheduleBreak } from './working-hours-validation.helper';

export type ConflictWorkingWindow = {
  isWorkingDay: boolean;
  startMinute: number | null;
  endMinute: number | null;
  breaks: ScheduleBreak[];
};

export type AffectedAppointment = {
  id: number;
  patientFullName: string;
  scheduledAt: Date;
};

/** True when [start, start+duration] lies entirely inside one free window. */
export function appointmentFitsWorkingWindow(
  startMinute: number,
  durationMinutes: number,
  window: ConflictWorkingWindow,
): boolean {
  if (durationMinutes <= 0) {
    return false;
  }
  const endMinute = startMinute + durationMinutes;
  const free = getFreeWindows(window);
  return free.some(
    (slot) => startMinute >= slot.startMinute && endMinute <= slot.endMinute,
  );
}

export function collectConflictingAppointments(input: {
  appointments: Array<{
    id: number;
    scheduledAt: Date;
    durationMinutes: number;
    patientFullName: string;
    startMinute: number;
  }>;
  resolveWindow: (appointment: {
    id: number;
    scheduledAt: Date;
    startMinute: number;
  }) => ConflictWorkingWindow | null;
}): AffectedAppointment[] {
  const affected: AffectedAppointment[] = [];

  for (const appt of input.appointments) {
    const window = input.resolveWindow(appt);
    if (window == null) {
      continue;
    }
    if (
      !appointmentFitsWorkingWindow(
        appt.startMinute,
        appt.durationMinutes,
        window,
      )
    ) {
      affected.push({
        id: appt.id,
        patientFullName: appt.patientFullName,
        scheduledAt: appt.scheduledAt,
      });
    }
  }

  return affected;
}
