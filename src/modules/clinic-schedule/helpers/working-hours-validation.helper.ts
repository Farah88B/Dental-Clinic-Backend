import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';

export interface ScheduleBreak {
  startMinute: number;
  endMinute: number;
}

export function normalizeBreaks(
  breaks: ScheduleBreak[] | null | undefined,
): ScheduleBreak[] {
  if (!breaks || breaks.length === 0) {
    return [];
  }
  return breaks.map((item) => ({
    startMinute: item.startMinute,
    endMinute: item.endMinute,
  }));
}

/** Overnight shifts are not supported (endMinute must be > startMinute). */
export function assertValidWorkingWindow(input: {
  isWorkingDay: boolean;
  startMinute?: number | null;
  endMinute?: number | null;
  breaks?: ScheduleBreak[] | null;
}): void {
  if (!input.isWorkingDay) {
    return;
  }

  const { startMinute, endMinute } = input;
  if (
    typeof startMinute !== 'number' ||
    typeof endMinute !== 'number' ||
    startMinute < 0 ||
    endMinute > 1439 ||
    endMinute <= startMinute
  ) {
    throw new BadRequestException(ERROR_CODES.INVALID_WORKING_HOURS_RANGE);
  }

  const breaks = normalizeBreaks(input.breaks);
  const sorted = [...breaks].sort((a, b) => a.startMinute - b.startMinute);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (
      current.endMinute <= current.startMinute ||
      current.startMinute < startMinute ||
      current.endMinute > endMinute
    ) {
      throw new BadRequestException(ERROR_CODES.INVALID_WORKING_HOURS_RANGE);
    }
    if (i > 0 && current.startMinute < sorted[i - 1].endMinute) {
      throw new BadRequestException(ERROR_CODES.INVALID_WORKING_HOURS_RANGE);
    }
  }
}

export function parseBreaksJson(value: unknown): ScheduleBreak[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item): item is ScheduleBreak =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as ScheduleBreak).startMinute === 'number' &&
        typeof (item as ScheduleBreak).endMinute === 'number',
    )
    .map((item) => ({
      startMinute: item.startMinute,
      endMinute: item.endMinute,
    }));
}
