import { ScheduleBreak } from './working-hours-validation.helper';

export interface MinuteWindow {
  startMinute: number;
  endMinute: number;
}

/** Subtract breaks from a working window; returns contiguous free ranges. */
export function getFreeWindows(input: {
  isWorkingDay: boolean;
  startMinute: number | null;
  endMinute: number | null;
  breaks: ScheduleBreak[];
}): MinuteWindow[] {
  if (
    !input.isWorkingDay ||
    input.startMinute == null ||
    input.endMinute == null
  ) {
    return [];
  }

  const sortedBreaks = [...input.breaks].sort(
    (a, b) => a.startMinute - b.startMinute,
  );
  const free: MinuteWindow[] = [];
  let cursor = input.startMinute;

  for (const br of sortedBreaks) {
    if (br.startMinute > cursor) {
      free.push({ startMinute: cursor, endMinute: br.startMinute });
    }
    cursor = Math.max(cursor, br.endMinute);
  }

  if (cursor < input.endMinute) {
    free.push({ startMinute: cursor, endMinute: input.endMinute });
  }

  return free;
}
