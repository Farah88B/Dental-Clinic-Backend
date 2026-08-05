import { DayOfWeek } from '@prisma/client';

const WEEKDAY_TO_ENUM: Record<string, DayOfWeek> = {
  Sun: DayOfWeek.SUNDAY,
  Mon: DayOfWeek.MONDAY,
  Tue: DayOfWeek.TUESDAY,
  Wed: DayOfWeek.WEDNESDAY,
  Thu: DayOfWeek.THURSDAY,
  Fri: DayOfWeek.FRIDAY,
  Sat: DayOfWeek.SATURDAY,
};

export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  dayOfWeek: DayOfWeek;
}

export interface ZonedDateTimeParts extends ZonedDateParts {
  hour: number;
  minute: number;
}

/** Calendar date as UTC midnight suitable for Prisma `@db.Date`. */
export function toUtcDateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function parseDateOnlyString(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const weekday = get('weekday') ?? 'Sun';
  const dayOfWeek = WEEKDAY_TO_ENUM[weekday] ?? DayOfWeek.SUNDAY;

  return { year, month, day, dayOfWeek };
}

export function getClinicTodayDateOnly(timeZone: string): Date {
  const { year, month, day } = getZonedDateParts(new Date(), timeZone);
  return toUtcDateOnly(year, month, day);
}

export function addDaysToDateOnly(dateOnly: Date, days: number): Date {
  const next = new Date(dateOnly);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dayOfWeekFromDateOnly(dateOnly: Date): DayOfWeek {
  const map: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];
  return map[dateOnly.getUTCDay()];
}

export function getZonedDateTimeParts(
  date: Date,
  timeZone: string,
): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const weekday = get('weekday') ?? 'Sun';
  const dayOfWeek = WEEKDAY_TO_ENUM[weekday] ?? DayOfWeek.SUNDAY;

  return { year, month, day, hour, minute, dayOfWeek };
}

export function getZonedMinutesOfDay(date: Date, timeZone: string): number {
  const { hour, minute } = getZonedDateTimeParts(date, timeZone);
  return hour * 60 + minute;
}

/**
 * Convert a clinic-local calendar day + minutes-from-midnight to a UTC Date.
 */
export function clinicLocalToUtc(
  year: number,
  month: number,
  day: number,
  totalMinutes: number,
  timeZone: string,
): Date {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let i = 0; i < 3; i++) {
    const zoned = getZonedDateTimeParts(utc, timeZone);
    const desiredMs = Date.UTC(year, month - 1, day, hour, minute);
    const actualMs = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
    );
    const diffMs = desiredMs - actualMs;
    if (diffMs === 0) {
      break;
    }
    utc = new Date(utc.getTime() + diffMs);
  }

  return utc;
}

export function dateOnlyKeyFromParts(
  year: number,
  month: number,
  day: number,
): string {
  return formatDateOnly(year, month, day);
}
