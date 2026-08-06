import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus, DayOfWeek, Prisma } from '@prisma/client';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ClinicScheduleAdapter } from '../adapter/clinic-schedule.adapter';
import { CreateScheduleExceptionDto } from '../dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from '../dto/update-schedule-exception.dto';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';
import { WorkingHoursDayDto } from '../dto/working-hours-day.dto';
import {
  addDaysToDateOnly,
  clinicLocalToUtc,
  dayOfWeekFromDateOnly,
  daysInMonth,
  formatDateOnly,
  getClinicTodayDateOnly,
  getZonedDateTimeParts,
  getZonedMinutesOfDay,
  parseDateOnlyString,
  toUtcDateOnly,
} from '../helpers/clinic-timezone.helper';
import {
  AffectedAppointment,
  collectConflictingAppointments,
  ConflictWorkingWindow,
} from '../helpers/schedule-conflict.helper';
import {
  assertValidWorkingWindow,
  normalizeBreaks,
  parseBreaksJson,
  ScheduleBreak,
} from '../helpers/working-hours-validation.helper';
import {
  formatMinutesToTime,
  parseTimeToMinutes,
} from '../helpers/schedule-time.helper';
import {
  clinicScheduleExceptionSelect,
  clinicWorkingHoursSelect,
} from '../selectors/clinic-schedule.select';

export interface ResolvedWorkingWindow {
  isWorkingDay: boolean;
  startMinute: number | null;
  endMinute: number | null;
  breaks: ScheduleBreak[];
}

const ALL_DAYS: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

const SCHEDULE_CONFLICT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING_CONFIRMATION,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_TREATMENT,
];

@Injectable()
export class ClinicScheduleService {
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: ClinicScheduleAdapter,
    private readonly configService: ConfigService,
  ) {
    this.timeZone =
      this.configService.get<string>('clinic.timezone') ?? 'Asia/Damascus';
  }

  async getWorkingHours() {
    const rows = await this.prisma.clinicWorkingHours.findMany({
      select: clinicWorkingHoursSelect(),
    });

    const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]));
    const ordered = ALL_DAYS.map((day) => byDay.get(day)).filter(
      (row): row is NonNullable<typeof row> => !!row,
    );

    return this.adapter.fromWorkingHoursArray(ordered);
  }

  async updateWorkingHours(
    dto: UpdateWorkingHoursDto,
    updatedByAccountId: number,
  ) {
    this.assertCompleteWeek(dto.days);

    const internalDays = dto.days.map((day) => this.fromApiWindow(day));
    for (const day of internalDays) {
      assertValidWorkingWindow(day);
    }

    // BR-50: dry-run against future active appointments under the proposed week.
    await this.assertNoAppointmentConflictsOrConfirmed({
      confirmed: dto.confirmed === true,
      kind: 'weekly',
      proposedByDay: new Map(
        internalDays.map((day, index) => [
          dto.days[index].dayOfWeek,
          {
            isWorkingDay: day.isWorkingDay,
            startMinute: day.startMinute,
            endMinute: day.endMinute,
            breaks: day.breaks,
          },
        ]),
      ),
    });

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.days.length; i++) {
        const dayOfWeek = dto.days[i].dayOfWeek;
        const payload = this.toPersistedWindow(internalDays[i]);
        await tx.clinicWorkingHours.upsert({
          where: { dayOfWeek },
          create: {
            dayOfWeek,
            ...payload,
            updatedByAccountId,
          },
          update: {
            ...payload,
            updatedByAccountId,
          },
        });
      }
    });

    return this.getWorkingHours();
  }

  async listExceptions(from?: string, to?: string) {
    const where: Prisma.ClinicScheduleExceptionWhereInput = {};
    if (from || to) {
      where.date = {};
      if (from) {
        const { year, month, day } = parseDateOnlyString(from);
        where.date.gte = toUtcDateOnly(year, month, day);
      }
      if (to) {
        const { year, month, day } = parseDateOnlyString(to);
        where.date.lte = toUtcDateOnly(year, month, day);
      }
    }

    const rows = await this.prisma.clinicScheduleException.findMany({
      where,
      select: clinicScheduleExceptionSelect(),
      orderBy: { date: 'asc' },
    });

    return this.adapter.fromExceptionsArray(rows);
  }

  async createException(
    dto: CreateScheduleExceptionDto,
    createdByAccountId: number,
  ) {
    const dateOnly = this.parseAndAssertNotPast(dto.date);
    const internal = this.fromApiWindow(dto);
    assertValidWorkingWindow(internal);
    const window = this.toPersistedWindow(internal);

    await this.assertNoAppointmentConflictsOrConfirmed({
      confirmed: dto.confirmed === true,
      kind: 'dates',
      overrides: [
        {
          dateOnly,
          window: {
            isWorkingDay: internal.isWorkingDay,
            startMinute: internal.startMinute,
            endMinute: internal.endMinute,
            breaks: internal.breaks,
          },
        },
      ],
    });

    const created = await this.prisma.clinicScheduleException.create({
      data: {
        date: dateOnly,
        isWorkingDay: window.isWorkingDay,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
        breaks: window.breaks,
        reason: dto.reason ?? null,
        createdByAccountId,
      },
      select: clinicScheduleExceptionSelect(),
    });

    return this.adapter.adaptException(created);
  }

  async updateException(id: number, dto: UpdateScheduleExceptionDto) {
    const existing =
      await this.prisma.clinicScheduleException.findUniqueOrThrow({
        where: { id },
        select: clinicScheduleExceptionSelect(),
      });

    const nextDate =
      dto.date !== undefined
        ? this.parseAndAssertNotPast(dto.date)
        : existing.date;

    const isWorkingDay = dto.isWorkingDay ?? existing.isWorkingDay;
    const existingBreaksApi = parseBreaksJson(existing.breaks).map((item) => ({
      startTime: formatMinutesToTime(item.startMinute),
      endTime: formatMinutesToTime(item.endMinute),
    }));

    const internal = this.fromApiWindow({
      isWorkingDay,
      startTime:
        dto.startTime !== undefined
          ? dto.startTime
          : existing.startMinute == null
            ? null
            : formatMinutesToTime(existing.startMinute),
      endTime:
        dto.endTime !== undefined
          ? dto.endTime
          : existing.endMinute == null
            ? null
            : formatMinutesToTime(existing.endMinute),
      breaks: dto.breaks !== undefined ? dto.breaks : existingBreaksApi,
    });

    assertValidWorkingWindow(internal);
    const merged = this.toPersistedWindow(internal);

    const overrides: Array<{
      dateOnly: Date;
      window: ConflictWorkingWindow;
    }> = [
      {
        dateOnly: nextDate,
        window: {
          isWorkingDay: internal.isWorkingDay,
          startMinute: internal.startMinute,
          endMinute: internal.endMinute,
          breaks: internal.breaks,
        },
      },
    ];

    // Moving the exception date reverts the old date to the weekly pattern.
    const oldDateKey = existing.date.toISOString().slice(0, 10);
    const nextDateKey = nextDate.toISOString().slice(0, 10);
    if (oldDateKey !== nextDateKey) {
      const weekly = await this.resolveWeeklyWindowOnly(existing.date);
      overrides.push({ dateOnly: existing.date, window: weekly });
    }

    await this.assertNoAppointmentConflictsOrConfirmed({
      confirmed: dto.confirmed === true,
      kind: 'dates',
      overrides,
    });

    const updated = await this.prisma.clinicScheduleException.update({
      where: { id },
      data: {
        date: nextDate,
        isWorkingDay: merged.isWorkingDay,
        startMinute: merged.startMinute,
        endMinute: merged.endMinute,
        breaks: merged.breaks,
        reason: dto.reason !== undefined ? dto.reason : existing.reason,
      },
      select: clinicScheduleExceptionSelect(),
    });

    return this.adapter.adaptException(updated);
  }

  async deleteException(id: number, confirmed?: boolean) {
    const existing =
      await this.prisma.clinicScheduleException.findUniqueOrThrow({
        where: { id },
        select: { id: true, date: true },
      });

    // Deleting reverts the date to the weekly pattern — BR-50 against that window.
    const weekly = await this.resolveWeeklyWindowOnly(existing.date);
    await this.assertNoAppointmentConflictsOrConfirmed({
      confirmed: confirmed === true,
      kind: 'dates',
      overrides: [{ dateOnly: existing.date, window: weekly }],
    });

    await this.prisma.clinicScheduleException.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async getCalendarMonth(
    year: number,
    month: number,
    options: { isStaffScheduleViewer: boolean },
  ) {
    const settings = await this.prisma.clinicSettings.findFirstOrThrow({
      select: {
        maxBookingHorizonDays: true,
        onlineBookingEnabled: true,
      },
    });

    const today = getClinicTodayDateOnly(this.timeZone);
    const horizonEnd = addDaysToDateOnly(today, settings.maxBookingHorizonDays);
    const totalDays = daysInMonth(year, month);
    const result: ReturnType<ClinicScheduleAdapter['adaptCalendarDay']>[] = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateOnly = toUtcDateOnly(year, month, day);
      const window = await this.resolveWorkingWindow(dateOnly);
      const withinHorizon = dateOnly >= today && dateOnly <= horizonEnd;

      let isBookable = false;
      if (options.isStaffScheduleViewer) {
        // Staff see real working days; horizon does not hide openness.
        isBookable = window.isWorkingDay;
      } else {
        isBookable =
          window.isWorkingDay &&
          withinHorizon &&
          settings.onlineBookingEnabled;
      }

      result.push(
        this.adapter.adaptCalendarDay({
          date: formatDateOnly(year, month, day),
          isWorkingDay: window.isWorkingDay,
          isBookable,
        }),
      );
    }

    return result;
  }

  /**
   * Resolves the effective working window for a calendar date.
   * Exception for the date wins; otherwise weekly pattern by day-of-week.
   */
  async resolveWorkingWindow(date: Date): Promise<ResolvedWorkingWindow> {
    const dateOnly = toUtcDateOnly(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );

    const exception = await this.prisma.clinicScheduleException.findUnique({
      where: { date: dateOnly },
      select: {
        isWorkingDay: true,
        startMinute: true,
        endMinute: true,
        breaks: true,
      },
    });

    if (exception) {
      return {
        isWorkingDay: exception.isWorkingDay,
        startMinute: exception.startMinute,
        endMinute: exception.endMinute,
        breaks: parseBreaksJson(exception.breaks),
      };
    }

    const weekly = await this.prisma.clinicWorkingHours.findUnique({
      where: { dayOfWeek: dayOfWeekFromDateOnly(dateOnly) },
      select: {
        isWorkingDay: true,
        startMinute: true,
        endMinute: true,
        breaks: true,
      },
    });

    if (!weekly || !weekly.isWorkingDay) {
      return {
        isWorkingDay: false,
        startMinute: null,
        endMinute: null,
        breaks: [],
      };
    }

    return {
      isWorkingDay: true,
      startMinute: weekly.startMinute,
      endMinute: weekly.endMinute,
      breaks: parseBreaksJson(weekly.breaks),
    };
  }

  private assertCompleteWeek(days: WorkingHoursDayDto[]): void {
    const unique = new Set(days.map((day) => day.dayOfWeek));
    if (unique.size !== 7 || ALL_DAYS.some((day) => !unique.has(day))) {
      throw new BadRequestException(ERROR_CODES.INVALID_WORKING_HOURS_DAYS);
    }
  }

  private parseAndAssertNotPast(dateStr: string): Date {
    const { year, month, day } = parseDateOnlyString(dateStr);
    const dateOnly = toUtcDateOnly(year, month, day);
    const today = getClinicTodayDateOnly(this.timeZone);
    if (dateOnly < today) {
      throw new BadRequestException(ERROR_CODES.PAST_DATE_NOT_ALLOWED);
    }
    return dateOnly;
  }

  /** Convert API HH:mm fields into internal minute-based window. */
  private fromApiWindow(input: {
    isWorkingDay: boolean;
    startTime?: string | null;
    endTime?: string | null;
    breaks?: Array<{ startTime: string; endTime: string }> | null;
  }): {
    isWorkingDay: boolean;
    startMinute: number | null;
    endMinute: number | null;
    breaks: ScheduleBreak[];
  } {
    if (!input.isWorkingDay) {
      return {
        isWorkingDay: false,
        startMinute: null,
        endMinute: null,
        breaks: [],
      };
    }

    return {
      isWorkingDay: true,
      startMinute:
        input.startTime != null && input.startTime !== ''
          ? parseTimeToMinutes(input.startTime)
          : null,
      endMinute:
        input.endTime != null && input.endTime !== ''
          ? parseTimeToMinutes(input.endTime)
          : null,
      breaks: (input.breaks ?? []).map((item) => ({
        startMinute: parseTimeToMinutes(item.startTime),
        endMinute: parseTimeToMinutes(item.endTime),
      })),
    };
  }

  private toPersistedWindow(input: {
    isWorkingDay: boolean;
    startMinute?: number | null;
    endMinute?: number | null;
    breaks?: ScheduleBreak[] | null;
  }): {
    isWorkingDay: boolean;
    startMinute: number | null;
    endMinute: number | null;
    breaks: Prisma.InputJsonValue;
  } {
    if (!input.isWorkingDay) {
      return {
        isWorkingDay: false,
        startMinute: null,
        endMinute: null,
        breaks: [],
      };
    }

    return {
      isWorkingDay: true,
      startMinute: input.startMinute ?? null,
      endMinute: input.endMinute ?? null,
      breaks: normalizeBreaks(input.breaks) as unknown as Prisma.InputJsonValue,
    };
  }

  /**
   * Weekly pattern only (ignores date exceptions). Used when an exception
   * is deleted or moved away from a date.
   */
  private async resolveWeeklyWindowOnly(
    date: Date,
  ): Promise<ConflictWorkingWindow> {
    const dateOnly = toUtcDateOnly(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
    const weekly = await this.prisma.clinicWorkingHours.findUnique({
      where: { dayOfWeek: dayOfWeekFromDateOnly(dateOnly) },
      select: {
        isWorkingDay: true,
        startMinute: true,
        endMinute: true,
        breaks: true,
      },
    });

    if (!weekly || !weekly.isWorkingDay) {
      return {
        isWorkingDay: false,
        startMinute: null,
        endMinute: null,
        breaks: [],
      };
    }

    return {
      isWorkingDay: true,
      startMinute: weekly.startMinute,
      endMinute: weekly.endMinute,
      breaks: parseBreaksJson(weekly.breaks),
    };
  }

  /**
   * BR-50: if future active appointments would fall outside the proposed
   * windows, require `confirmed=true`. Does not cancel or modify appointments.
   */
  private async assertNoAppointmentConflictsOrConfirmed(
    input:
      | {
          confirmed: boolean;
          kind: 'weekly';
          proposedByDay: Map<DayOfWeek, ConflictWorkingWindow>;
        }
      | {
          confirmed: boolean;
          kind: 'dates';
          overrides: Array<{
            dateOnly: Date;
            window: ConflictWorkingWindow;
          }>;
        },
  ): Promise<void> {
    const affected =
      input.kind === 'weekly'
        ? await this.findConflictsForWeeklyChange(input.proposedByDay)
        : await this.findConflictsForDateOverrides(input.overrides);

    if (affected.length > 0 && !input.confirmed) {
      throw new ConflictException({
        message: ERROR_CODES.SCHEDULE_CHANGE_HAS_CONFLICTS,
        details: { affectedAppointments: affected },
      });
    }
  }

  private async findConflictsForWeeklyChange(
    proposedByDay: Map<DayOfWeek, ConflictWorkingWindow>,
  ): Promise<AffectedAppointment[]> {
    const now = new Date();
    const today = getClinicTodayDateOnly(this.timeZone);

    const [appointments, exceptions] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: now },
          status: { in: [...SCHEDULE_CONFLICT_STATUSES] },
        },
        select: {
          id: true,
          scheduledAt: true,
          durationMinutes: true,
          patient: { select: { fullName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.clinicScheduleException.findMany({
        where: { date: { gte: today } },
        select: { date: true },
      }),
    ]);

    const exceptionDates = new Set(
      exceptions.map((row) => row.date.toISOString().slice(0, 10)),
    );

    return collectConflictingAppointments({
      appointments: appointments.map((appt) => ({
        id: appt.id,
        scheduledAt: appt.scheduledAt,
        durationMinutes: appt.durationMinutes,
        patientFullName: appt.patient.fullName,
        startMinute: getZonedMinutesOfDay(appt.scheduledAt, this.timeZone),
      })),
      resolveWindow: (appt) => {
        const zoned = getZonedDateTimeParts(appt.scheduledAt, this.timeZone);
        const dateKey = formatDateOnly(zoned.year, zoned.month, zoned.day);
        // Existing exceptions still own those dates; weekly edit does not apply.
        if (exceptionDates.has(dateKey)) {
          return null;
        }
        return (
          proposedByDay.get(zoned.dayOfWeek) ?? {
            isWorkingDay: false,
            startMinute: null,
            endMinute: null,
            breaks: [],
          }
        );
      },
    });
  }

  private async findConflictsForDateOverrides(
    overrides: Array<{ dateOnly: Date; window: ConflictWorkingWindow }>,
  ): Promise<AffectedAppointment[]> {
    if (overrides.length === 0) {
      return [];
    }

    const now = new Date();
    const windowsByDate = new Map(
      overrides.map((item) => [
        item.dateOnly.toISOString().slice(0, 10),
        item.window,
      ]),
    );

    const dayRanges = overrides.map((item) => {
      const y = item.dateOnly.getUTCFullYear();
      const m = item.dateOnly.getUTCMonth() + 1;
      const d = item.dateOnly.getUTCDate();
      const start = clinicLocalToUtc(y, m, d, 0, this.timeZone);
      const next = addDaysToDateOnly(item.dateOnly, 1);
      const end = clinicLocalToUtc(
        next.getUTCFullYear(),
        next.getUTCMonth() + 1,
        next.getUTCDate(),
        0,
        this.timeZone,
      );
      return { start, end };
    });

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { in: [...SCHEDULE_CONFLICT_STATUSES] },
        scheduledAt: { gte: now },
        OR: dayRanges.map((range) => ({
          scheduledAt: { gte: range.start, lt: range.end },
        })),
      },
      select: {
        id: true,
        scheduledAt: true,
        durationMinutes: true,
        patient: { select: { fullName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return collectConflictingAppointments({
      appointments: appointments.map((appt) => ({
        id: appt.id,
        scheduledAt: appt.scheduledAt,
        durationMinutes: appt.durationMinutes,
        patientFullName: appt.patient.fullName,
        startMinute: getZonedMinutesOfDay(appt.scheduledAt, this.timeZone),
      })),
      resolveWindow: (appt) => {
        const zoned = getZonedDateTimeParts(appt.scheduledAt, this.timeZone);
        const dateKey = formatDateOnly(zoned.year, zoned.month, zoned.day);
        return windowsByDate.get(dateKey) ?? null;
      },
    });
  }
}

