import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';

/** 24h clock `HH:mm` (00:00–23:59). */
export const TIME_HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseTimeToMinutes(time: string): number {
  if (!TIME_HH_MM_PATTERN.test(time)) {
    throw new BadRequestException(ERROR_CODES.INVALID_TIME_FORMAT);
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function nullableMinutesToTime(
  totalMinutes: number | null | undefined,
): string | null {
  if (totalMinutes == null) {
    return null;
  }
  return formatMinutesToTime(totalMinutes);
}
