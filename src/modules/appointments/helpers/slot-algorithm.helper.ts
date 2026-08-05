import { MinuteWindow } from 'src/modules/clinic-schedule/helpers/free-windows.helper';
import { APPOINTMENT_CONSTANTS } from 'src/common/constants/appointment.constants';

export interface BusyInterval {
  startMinute: number;
  endMinute: number;
}

function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) {
    return [];
  }
  const sorted = [...intervals].sort((a, b) => a.startMinute - b.startMinute);
  const merged: BusyInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, current.endMinute);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Generate bookable start times (minutes from midnight) inside free windows,
 * avoiding busy intervals. Granularity 15; on conflict jump to conflict.end.
 */
export function computeAvailableSlotStarts(input: {
  freeWindows: MinuteWindow[];
  busyIntervals: BusyInterval[];
  durationMinutes: number;
  earliestStartMinute?: number;
  granularityMinutes?: number;
}): number[] {
  const granularity =
    input.granularityMinutes ?? APPOINTMENT_CONSTANTS.SLOT_GRANULARITY_MINUTES;
  const duration = input.durationMinutes;
  if (duration <= 0) {
    return [];
  }

  const busy = mergeIntervals(input.busyIntervals);
  const starts: number[] = [];
  const earliest = input.earliestStartMinute ?? 0;

  for (const window of input.freeWindows) {
    let cursor = Math.max(window.startMinute, earliest);
    const rem = cursor % granularity;
    if (rem !== 0) {
      cursor += granularity - rem;
    }

    while (cursor + duration <= window.endMinute) {
      const slotEnd = cursor + duration;
      const conflict = busy.find((b) =>
        overlaps(cursor, slotEnd, b.startMinute, b.endMinute),
      );

      if (!conflict) {
        starts.push(cursor);
        cursor += granularity;
        continue;
      }

      // Jump past the conflict block, then re-align to granularity.
      cursor = Math.max(cursor + granularity, conflict.endMinute);
      const jumpRem = cursor % granularity;
      if (jumpRem !== 0) {
        cursor += granularity - jumpRem;
      }
    }
  }

  return starts;
}

/** Expand an appointment into a busy block including post-appointment buffer. */
export function toBusyInterval(
  startMinute: number,
  durationMinutes: number,
  bufferMinutes: number,
): BusyInterval {
  return {
    startMinute,
    endMinute: startMinute + durationMinutes + Math.max(0, bufferMinutes),
  };
}
