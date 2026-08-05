import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppointmentStatus,
  AppointmentType,
  PatientStatus,
  TreatmentPlanStatus,
  TreatmentSessionStatus,
} from '@prisma/client';
import { APPOINTMENT_ERROR_CODES } from 'src/common/constants/appointment.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import {
  addDaysToDateOnly,
  clinicLocalToUtc,
  daysInMonth,
  formatDateOnly,
  getClinicTodayDateOnly,
  getZonedDateTimeParts,
  getZonedMinutesOfDay,
  parseDateOnlyString,
  toUtcDateOnly,
} from 'src/modules/clinic-schedule/helpers/clinic-timezone.helper';
import { getFreeWindows } from 'src/modules/clinic-schedule/helpers/free-windows.helper';
import { formatMinutesToTime } from 'src/modules/clinic-schedule/helpers/schedule-time.helper';
import { ClinicScheduleService } from 'src/modules/clinic-schedule/services/clinic-schedule.service';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  computeCanBook,
  SessionOrderStatus,
} from 'src/modules/treatment-sessions/helpers/session-flags.helper';
import {
  AvailableDayResponseDto,
  AvailableSlotResponseDto,
} from '../dto/appointment-response.dto';
import { resolveAppointmentDurationMinutes } from '../helpers/appointment-duration.helper';
import {
  computeAvailableSlotStarts,
  toBusyInterval,
} from '../helpers/slot-algorithm.helper';

export type AppointmentBookingAccess =
  | { source: 'APP'; accountId: number }
  | { source: 'DASHBOARD' };

type BookingSettings = {
  bufferTimeMinutes: number;
  defaultConsultationDurationMinutes: number;
  maxBookingHorizonDays: number;
  onlineBookingEnabled: boolean;
  autoConfirmationEnabled: boolean;
  cancelRescheduleWindowHours: number;
};

type SessionBookingContext = {
  id: number;
  durationMinutes: number | null;
  availableForBookingAt: Date | null;
  status: TreatmentSessionStatus;
  patientId: number;
  planSessions: SessionOrderStatus[];
};

@Injectable()
export class AppointmentAvailabilityService {
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicScheduleService: ClinicScheduleService,
    private readonly configService: ConfigService,
  ) {
    this.timeZone =
      this.configService.get<string>('clinic.timezone') ?? 'Asia/Damascus';
  }

  async getBookableDays(
    query: {
      patientId: number;
      type: AppointmentType;
      treatmentSessionId?: number;
      month: number;
      year: number;
    },
    access: AppointmentBookingAccess,
  ): Promise<AvailableDayResponseDto[]> {
    await this.assertPatientAccess(query.patientId, access);
    const settings = await this.loadSettings();
    this.assertOnlineBookingIfApp(access, settings);

    if (query.type === AppointmentType.CONSULTATION) {
      const open = await this.prisma.appointment.findFirst({
        where: {
          patientId: query.patientId,
          type: AppointmentType.CONSULTATION,
          status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
        },
        select: { id: true },
      });
      if (open) {
        return [];
      }
    }

    const session =
      query.type === AppointmentType.FOLLOW_UP
        ? await this.loadBookableSession(
            query.patientId,
            query.treatmentSessionId,
          )
        : null;

    const durationMinutes = resolveAppointmentDurationMinutes({
      type: query.type,
      sessionDurationMinutes: session?.durationMinutes,
      defaultConsultationDurationMinutes:
        settings.defaultConsultationDurationMinutes,
    });

    const today = getClinicTodayDateOnly(this.timeZone);
    const horizonEnd = addDaysToDateOnly(today, settings.maxBookingHorizonDays);
    const totalDays = daysInMonth(query.year, query.month);
    const result: AvailableDayResponseDto[] = [];

    const followUpFloor = session?.availableForBookingAt
      ? (() => {
          const z = getZonedDateTimeParts(
            session.availableForBookingAt,
            this.timeZone,
          );
          return toUtcDateOnly(z.year, z.month, z.day);
        })()
      : null;

    for (let day = 1; day <= totalDays; day++) {
      const dateOnly = toUtcDateOnly(query.year, query.month, day);
      if (dateOnly < today) {
        continue;
      }
      if (access.source === 'APP' && dateOnly > horizonEnd) {
        continue;
      }
      if (followUpFloor && dateOnly < followUpFloor) {
        continue;
      }

      const slots = await this.computeSlotsForDate({
        dateOnly,
        durationMinutes,
        bufferTimeMinutes: settings.bufferTimeMinutes,
        today,
      });

      if (slots.length === 0) {
        continue;
      }

      result.push(
        new AvailableDayResponseDto({
          date: formatDateOnly(query.year, query.month, day),
          isWorkingDay: true,
          hasAvailableSlots: true,
        }),
      );
    }

    return result;
  }

  async getAvailableSlots(
    query: {
      patientId: number;
      type: AppointmentType;
      treatmentSessionId?: number;
      date: string;
    },
    access: AppointmentBookingAccess,
  ): Promise<AvailableSlotResponseDto[]> {
    await this.assertPatientAccess(query.patientId, access);
    const settings = await this.loadSettings();
    this.assertOnlineBookingIfApp(access, settings);

    if (query.type === AppointmentType.CONSULTATION) {
      const open = await this.prisma.appointment.findFirst({
        where: {
          patientId: query.patientId,
          type: AppointmentType.CONSULTATION,
          status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
        },
        select: { id: true },
      });
      if (open) {
        return [];
      }
    }

    const session =
      query.type === AppointmentType.FOLLOW_UP
        ? await this.loadBookableSession(
            query.patientId,
            query.treatmentSessionId,
          )
        : null;

    const durationMinutes = resolveAppointmentDurationMinutes({
      type: query.type,
      sessionDurationMinutes: session?.durationMinutes,
      defaultConsultationDurationMinutes:
        settings.defaultConsultationDurationMinutes,
    });

    const { year, month, day } = parseDateOnlyString(query.date);
    const dateOnly = toUtcDateOnly(year, month, day);
    const today = getClinicTodayDateOnly(this.timeZone);
    const horizonEnd = addDaysToDateOnly(today, settings.maxBookingHorizonDays);

    if (dateOnly < today) {
      return [];
    }
    if (access.source === 'APP' && dateOnly > horizonEnd) {
      return [];
    }

    if (session?.availableForBookingAt) {
      const z = getZonedDateTimeParts(
        session.availableForBookingAt,
        this.timeZone,
      );
      const floor = toUtcDateOnly(z.year, z.month, z.day);
      if (dateOnly < floor) {
        return [];
      }
    }

    const starts = await this.computeSlotsForDate({
      dateOnly,
      durationMinutes,
      bufferTimeMinutes: settings.bufferTimeMinutes,
      today,
    });

    return starts.map(
      (startMinute) =>
        new AvailableSlotResponseDto({
          startTime: formatMinutesToTime(startMinute),
        }),
    );
  }

  /**
   * Shared create-time check: is this start minute bookable on that clinic day?
   */
  async isSlotAvailable(input: {
    dateOnly: Date;
    startMinute: number;
    durationMinutes: number;
    bufferTimeMinutes: number;
    excludeAppointmentId?: number;
  }): Promise<boolean> {
    const today = getClinicTodayDateOnly(this.timeZone);
    const starts = await this.computeSlotsForDate({
      dateOnly: input.dateOnly,
      durationMinutes: input.durationMinutes,
      bufferTimeMinutes: input.bufferTimeMinutes,
      today,
      excludeAppointmentId: input.excludeAppointmentId,
    });
    return starts.includes(input.startMinute);
  }

  async loadSettings(): Promise<BookingSettings> {
    return this.prisma.clinicSettings.findFirstOrThrow({
      select: {
        bufferTimeMinutes: true,
        defaultConsultationDurationMinutes: true,
        maxBookingHorizonDays: true,
        onlineBookingEnabled: true,
        autoConfirmationEnabled: true,
        cancelRescheduleWindowHours: true,
      },
    });
  }

  async assertPatientAccess(
    patientId: number,
    access: AppointmentBookingAccess,
  ) {
    if (access.source === 'APP') {
      const patient = await this.prisma.patient.findUniqueOrThrow({
        where: { id: patientId, accountId: access.accountId },
        select: { id: true, status: true },
      });
      if (patient.status === PatientStatus.ARCHIVED) {
        throw new BadRequestException(
          APPOINTMENT_ERROR_CODES.PATIENT_ARCHIVED_CANNOT_BOOK,
        );
      }
      return;
    }

    const patient = await this.prisma.patient.findUniqueOrThrow({
      where: { id: patientId },
      select: { id: true, status: true },
    });
    if (patient.status === PatientStatus.ARCHIVED) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.PATIENT_ARCHIVED_CANNOT_BOOK,
      );
    }
  }

  assertOnlineBookingIfApp(
    access: AppointmentBookingAccess,
    settings: BookingSettings,
  ) {
    if (access.source === 'APP' && !settings.onlineBookingEnabled) {
      throw new ForbiddenException(
        APPOINTMENT_ERROR_CODES.ONLINE_BOOKING_DISABLED,
      );
    }
  }

  async loadBookableSession(
    patientId: number,
    treatmentSessionId?: number,
  ): Promise<SessionBookingContext> {
    if (treatmentSessionId == null) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.TREATMENT_SESSION_REQUIRED,
      );
    }

    const session = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id: treatmentSessionId },
      select: {
        id: true,
        status: true,
        durationMinutes: true,
        availableForBookingAt: true,
        treatmentPlan: {
          select: {
            patientId: true,
            status: true,
            sessions: {
              select: {
                id: true,
                sessionOrder: true,
                status: true,
              },
            },
          },
        },
        appointments: {
          where: {
            status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (session.treatmentPlan.patientId !== patientId) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_SESSION_NOT_BOOKABLE,
      );
    }
    if (session.treatmentPlan.status !== TreatmentPlanStatus.ACTIVE) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_SESSION_NOT_BOOKABLE,
      );
    }

    const planSessions: SessionOrderStatus[] =
      session.treatmentPlan.sessions.map((s) => ({
        id: s.id,
        sessionOrder: s.sessionOrder,
        status: s.status,
      }));

    const hasActiveAppointment = session.appointments.length > 0;
    if (
      !computeCanBook(
        { id: session.id, status: session.status },
        planSessions,
        hasActiveAppointment,
      )
    ) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_SESSION_NOT_BOOKABLE,
      );
    }

    return {
      id: session.id,
      durationMinutes: session.durationMinutes,
      availableForBookingAt: session.availableForBookingAt,
      status: session.status,
      patientId: session.treatmentPlan.patientId,
      planSessions,
    };
  }

  private async computeSlotsForDate(input: {
    dateOnly: Date;
    durationMinutes: number;
    bufferTimeMinutes: number;
    today: Date;
    excludeAppointmentId?: number;
  }): Promise<number[]> {
    const window = await this.clinicScheduleService.resolveWorkingWindow(
      input.dateOnly,
    );
    const freeWindows = getFreeWindows(window);
    if (freeWindows.length === 0) {
      return [];
    }

    const year = input.dateOnly.getUTCFullYear();
    const month = input.dateOnly.getUTCMonth() + 1;
    const day = input.dateOnly.getUTCDate();

    const dayStartUtc = clinicLocalToUtc(year, month, day, 0, this.timeZone);
    // Exclusive end of day: next clinic-local midnight
    const nextDay = addDaysToDateOnly(input.dateOnly, 1);
    const nextDayStartUtc = clinicLocalToUtc(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
      0,
      this.timeZone,
    );

    const busyAppointments = await this.prisma.appointment.findMany({
      where: {
        status: {
          in: [
            AppointmentStatus.PENDING_CONFIRMATION,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.IN_TREATMENT,
          ],
        },
        scheduledAt: {
          gte: dayStartUtc,
          lt: nextDayStartUtc,
        },
        ...(input.excludeAppointmentId
          ? { id: { not: input.excludeAppointmentId } }
          : {}),
      },
      select: {
        scheduledAt: true,
        durationMinutes: true,
      },
    });

    const busyIntervals = busyAppointments.map((appt) =>
      toBusyInterval(
        getZonedMinutesOfDay(appt.scheduledAt, this.timeZone),
        appt.durationMinutes,
        input.bufferTimeMinutes,
      ),
    );

    let earliestStartMinute: number | undefined;
    if (input.dateOnly.getTime() === input.today.getTime()) {
      earliestStartMinute = getZonedMinutesOfDay(new Date(), this.timeZone);
    }

    return computeAvailableSlotStarts({
      freeWindows,
      busyIntervals,
      durationMinutes: input.durationMinutes,
      earliestStartMinute,
    });
  }
}
