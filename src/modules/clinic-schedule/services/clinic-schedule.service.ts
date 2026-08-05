import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DayOfWeek, Prisma } from '@prisma/client';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ClinicScheduleAdapter } from '../adapter/clinic-schedule.adapter';
import { CreateScheduleExceptionDto } from '../dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from '../dto/update-schedule-exception.dto';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';
import { WorkingHoursDayDto } from '../dto/working-hours-day.dto';
import {
  addDaysToDateOnly,
  dayOfWeekFromDateOnly,
  daysInMonth,
  formatDateOnly,
  getClinicTodayDateOnly,
  parseDateOnlyString,
  toUtcDateOnly,
} from '../helpers/clinic-timezone.helper';
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

    // TODO(Appointments): BR-50 dry-run against future active appointments.
    // If conflicts exist and dto.confirmed !== true, throw ConflictException
    // with ERROR_CODES.SCHEDULE_CHANGE_HAS_CONFLICTS and details.affectedAppointments.
    // Do NOT auto-cancel/modify appointments when confirmed.
    await this.assertNoAppointmentConflictsOrConfirmed({
      confirmed: dto.confirmed === true,
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

    // TODO(Appointments): BR-50 dry-run for this single date + confirmed flag
    await this.assertNoAppointmentConflictsOrConfirmed({
      confirmed: dto.confirmed === true,
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

    // TODO(Appointments): BR-50 dry-run for resulting window + confirmed flag
    await this.assertNoAppointmentConflictsOrConfirmed({
      confirmed: dto.confirmed === true,
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
    await this.prisma.clinicScheduleException.findUniqueOrThrow({
      where: { id },
      select: { id: true },
    });

    // TODO(Appointments): BR-50 — deleting reverts date to weekly pattern.
    await this.assertNoAppointmentConflictsOrConfirmed({
      confirmed: confirmed === true,
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
   * Public contract for the future Appointments module.
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
   * TODO(Appointments): Replace stub with real conflict detection.
   * Query statuses PENDING_CONFIRMATION | CONFIRMED | CHECKED_IN where
   * scheduledAt >= now; compare appointment interval against proposed windows
   * (minus breaks). Duration = appointment.durationMinutes ??
   * ClinicSettings.defaultConsultationDurationMinutes.
   */
  private async assertNoAppointmentConflictsOrConfirmed(input: {
    confirmed: boolean;
  }): Promise<void> {
    const affectedAppointments: Array<{
      id: number;
      patientFullName: string;
      scheduledAt: Date;
    }> = [];

    if (affectedAppointments.length > 0 && !input.confirmed) {
      throw new ConflictException({
        message: ERROR_CODES.SCHEDULE_CHANGE_HAS_CONFLICTS,
        details: { affectedAppointments },
      });
    }
  }
}
