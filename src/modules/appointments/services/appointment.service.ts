import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppointmentStatus,
  AppointmentType,
  TreatmentSessionStatus,
} from '@prisma/client';
import { APPOINTMENT_ERROR_CODES } from 'src/common/constants/appointment.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import {
  addDaysToDateOnly,
  clinicLocalToUtc,
  getClinicTodayDateOnly,
  getZonedDateTimeParts,
  getZonedMinutesOfDay,
  toUtcDateOnly,
} from 'src/modules/clinic-schedule/helpers/clinic-timezone.helper';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  APPOINTMENT_STATUSES_THAT_BOOK_SESSION,
} from 'src/modules/treatment-sessions/helpers/session-flags.helper';
import { AppointmentAdapter } from '../adapter/appointment.adapter';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { CreateAppAppointmentDto } from '../dto/create-app-appointment.dto';
import { CreateDashboardAppointmentDto } from '../dto/create-dashboard-appointment.dto';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto';
import { resolveAppointmentDurationMinutes } from '../helpers/appointment-duration.helper';
import { resolveInitialAppointmentStatus } from '../helpers/appointment-status.helper';
import { appointmentSelect } from '../selectors/appointment.select';
import {
  AppointmentAvailabilityService,
  AppointmentBookingAccess,
} from './appointment-availability.service';

const MUTABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING_CONFIRMATION,
  AppointmentStatus.CONFIRMED,
];

@Injectable()
export class AppointmentService {
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AppointmentAvailabilityService,
    private readonly adapter: AppointmentAdapter,
    private readonly configService: ConfigService,
  ) {
    this.timeZone =
      this.configService.get<string>('clinic.timezone') ?? 'Asia/Damascus';
  }

  createFromApp(
    dto: CreateAppAppointmentDto,
    accountId: number,
  ): Promise<AppointmentResponseDto> {
    return this.create(
      {
        patientId: dto.patientId,
        type: dto.type,
        scheduledAt: new Date(dto.scheduledAt),
        treatmentSessionId: dto.treatmentSessionId ?? null,
        reasonForVisit: dto.reasonForVisit ?? null,
        chatbotSummary: dto.chatbotSummary ?? null,
        notes: null,
        isWaiting: false,
      },
      { source: 'APP', accountId },
      accountId,
    );
  }

  createFromDashboard(
    dto: CreateDashboardAppointmentDto,
    accountId: number,
  ): Promise<AppointmentResponseDto> {
    return this.create(
      {
        patientId: dto.patientId,
        type: dto.type,
        scheduledAt: new Date(dto.scheduledAt),
        treatmentSessionId: dto.treatmentSessionId ?? null,
        reasonForVisit: dto.reasonForVisit ?? null,
        chatbotSummary: dto.chatbotSummary ?? null,
        notes: dto.notes ?? null,
        isWaiting: dto.isWaiting ?? false,
      },
      { source: 'DASHBOARD' },
      accountId,
    );
  }

  rescheduleFromApp(
    id: number,
    dto: RescheduleAppointmentDto,
    accountId: number,
  ): Promise<AppointmentResponseDto> {
    return this.reschedule(
      id,
      new Date(dto.scheduledAt),
      { source: 'APP', accountId },
      accountId,
    );
  }

  rescheduleFromDashboard(
    id: number,
    dto: RescheduleAppointmentDto,
    accountId: number,
  ): Promise<AppointmentResponseDto> {
    return this.reschedule(
      id,
      new Date(dto.scheduledAt),
      { source: 'DASHBOARD' },
      accountId,
    );
  }

  cancelFromApp(
    id: number,
    dto: CancelAppointmentDto,
    accountId: number,
  ): Promise<AppointmentResponseDto> {
    return this.cancel(
      id,
      dto.cancellationReason ?? null,
      { source: 'APP', accountId },
      accountId,
    );
  }

  cancelFromDashboard(
    id: number,
    dto: CancelAppointmentDto,
    accountId: number,
  ): Promise<AppointmentResponseDto> {
    return this.cancel(
      id,
      dto.cancellationReason ?? null,
      { source: 'DASHBOARD' },
      accountId,
    );
  }

  private async reschedule(
    id: number,
    requestedScheduledAt: Date,
    access: AppointmentBookingAccess,
    actorAccountId: number,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.loadMutableAppointment(id, access);
    this.assertMutableStatus(
      appointment.status,
      APPOINTMENT_ERROR_CODES.APPOINTMENT_NOT_RESCHEDULABLE,
    );

    const settings = await this.availabilityService.loadSettings();
    this.assertWithinCancelRescheduleWindow(
      access,
      appointment.scheduledAt,
      settings.cancelRescheduleWindowHours,
    );

    const zoned = getZonedDateTimeParts(requestedScheduledAt, this.timeZone);
    const dateOnly = toUtcDateOnly(zoned.year, zoned.month, zoned.day);
    const startMinute = zoned.hour * 60 + zoned.minute;
    const today = getClinicTodayDateOnly(this.timeZone);
    const horizonEnd = addDaysToDateOnly(today, settings.maxBookingHorizonDays);

    if (dateOnly < today) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_PAST_NOT_ALLOWED,
      );
    }
    if (
      dateOnly.getTime() === today.getTime() &&
      startMinute < getZonedMinutesOfDay(new Date(), this.timeZone)
    ) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_PAST_NOT_ALLOWED,
      );
    }
    if (access.source === 'APP' && dateOnly > horizonEnd) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_OUTSIDE_HORIZON,
      );
    }

    const scheduledAt = clinicLocalToUtc(
      zoned.year,
      zoned.month,
      zoned.day,
      startMinute,
      this.timeZone,
    );

    const slotOk = await this.availabilityService.isSlotAvailable({
      dateOnly,
      startMinute,
      durationMinutes: appointment.durationMinutes,
      bufferTimeMinutes: settings.bufferTimeMinutes,
      excludeAppointmentId: appointment.id,
    });
    if (!slotOk) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_SLOT_UNAVAILABLE,
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledAt,
        rescheduledAt: new Date(),
        rescheduledById: actorAccountId,
      },
      select: appointmentSelect(),
    });

    return this.adapter.adapt(updated);
  }

  private async cancel(
    id: number,
    cancellationReason: string | null,
    access: AppointmentBookingAccess,
    actorAccountId: number,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.loadMutableAppointment(id, access);
    this.assertMutableStatus(
      appointment.status,
      APPOINTMENT_ERROR_CODES.APPOINTMENT_NOT_CANCELLABLE,
    );

    const settings = await this.availabilityService.loadSettings();
    this.assertWithinCancelRescheduleWindow(
      access,
      appointment.scheduledAt,
      settings.cancelRescheduleWindowHours,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: actorAccountId,
          cancellationReason,
        },
        select: appointmentSelect(),
      });

      // EC-3: cancel appointment only; session returns to PENDING if it was BOOKED
      if (appointment.treatmentSessionId != null) {
        const session = await tx.treatmentSession.findUnique({
          where: { id: appointment.treatmentSessionId },
          select: { id: true, status: true },
        });
        if (session?.status === TreatmentSessionStatus.BOOKED) {
          await tx.treatmentSession.update({
            where: { id: session.id },
            data: { status: TreatmentSessionStatus.PENDING },
          });
        }
      }

      return cancelled;
    });

    return this.adapter.adapt(updated);
  }

  private async loadMutableAppointment(
    id: number,
    access: AppointmentBookingAccess,
  ) {
    const appointment = await this.prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        patientId: true,
        status: true,
        scheduledAt: true,
        durationMinutes: true,
        treatmentSessionId: true,
        patient: { select: { accountId: true } },
      },
    });

    if (access.source === 'APP') {
      if (appointment.patient.accountId !== access.accountId) {
        throw new ForbiddenException();
      }
    }

    return appointment;
  }

  private assertMutableStatus(
    status: AppointmentStatus,
    errorCode: string,
  ): void {
    if (!MUTABLE_STATUSES.includes(status)) {
      throw new BadRequestException(errorCode);
    }
  }

  private assertWithinCancelRescheduleWindow(
    access: AppointmentBookingAccess,
    scheduledAt: Date,
    windowHours: number,
  ): void {
    if (access.source !== 'APP') {
      return;
    }
    const msUntil = scheduledAt.getTime() - Date.now();
    const hoursUntil = msUntil / (1000 * 60 * 60);
    if (hoursUntil < windowHours) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_OUTSIDE_CANCEL_RESCHEDULE_WINDOW,
      );
    }
  }

  private async create(
    input: {
      patientId: number;
      type: AppointmentType;
      scheduledAt: Date;
      treatmentSessionId: number | null;
      reasonForVisit: string | null;
      chatbotSummary: string | null;
      notes: string | null;
      isWaiting: boolean;
    },
    access: AppointmentBookingAccess,
    createdById: number,
  ): Promise<AppointmentResponseDto> {
    await this.availabilityService.assertPatientAccess(
      input.patientId,
      access,
    );
    const settings = await this.availabilityService.loadSettings();
    this.availabilityService.assertOnlineBookingIfApp(access, settings);

    this.assertTypeSessionPair(input.type, input.treatmentSessionId);

    if (input.type === AppointmentType.CONSULTATION) {
      await this.assertNoActiveConsultation(input.patientId);
    }

    let sessionId: number | null = null;
    let sessionDuration: number | null = null;

    if (input.type === AppointmentType.FOLLOW_UP) {
      const session = await this.availabilityService.loadBookableSession(
        input.patientId,
        input.treatmentSessionId ?? undefined,
      );
      sessionId = session.id;
      sessionDuration = session.durationMinutes;

      if (session.availableForBookingAt) {
        const now = new Date();
        if (now < session.availableForBookingAt) {
          throw new BadRequestException(
            APPOINTMENT_ERROR_CODES.APPOINTMENT_SESSION_NOT_BOOKABLE,
          );
        }
      }
    }

    const durationMinutes = resolveAppointmentDurationMinutes({
      type: input.type,
      sessionDurationMinutes: sessionDuration,
      defaultConsultationDurationMinutes:
        settings.defaultConsultationDurationMinutes,
    });

    const zoned = getZonedDateTimeParts(input.scheduledAt, this.timeZone);
    const dateOnly = toUtcDateOnly(zoned.year, zoned.month, zoned.day);
    const startMinute = zoned.hour * 60 + zoned.minute;
    const today = getClinicTodayDateOnly(this.timeZone);
    const horizonEnd = addDaysToDateOnly(today, settings.maxBookingHorizonDays);

    if (dateOnly < today && !input.isWaiting) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_PAST_NOT_ALLOWED,
      );
    }

    if (
      !input.isWaiting &&
      dateOnly.getTime() === today.getTime() &&
      startMinute < getZonedMinutesOfDay(new Date(), this.timeZone)
    ) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_PAST_NOT_ALLOWED,
      );
    }

    if (access.source === 'APP' && dateOnly > horizonEnd) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_OUTSIDE_HORIZON,
      );
    }

    const scheduledAt = clinicLocalToUtc(
      zoned.year,
      zoned.month,
      zoned.day,
      startMinute,
      this.timeZone,
    );

    const status = resolveInitialAppointmentStatus({
      source: access.source,
      autoConfirmationEnabled: settings.autoConfirmationEnabled,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      if (input.type === AppointmentType.CONSULTATION) {
        const open = await tx.appointment.findFirst({
          where: {
            patientId: input.patientId,
            type: AppointmentType.CONSULTATION,
            status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
          },
          select: { id: true },
        });
        if (open) {
          throw new BadRequestException(
            APPOINTMENT_ERROR_CODES.ACTIVE_CONSULTATION_EXISTS,
          );
        }
      }

      if (sessionId != null) {
        const activeOnSession = await tx.appointment.findFirst({
          where: {
            treatmentSessionId: sessionId,
            status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
          },
          select: { id: true },
        });
        if (activeOnSession) {
          throw new BadRequestException(
            APPOINTMENT_ERROR_CODES.APPOINTMENT_SESSION_NOT_BOOKABLE,
          );
        }
      }

      const slotOk = await this.availabilityService.isSlotAvailable({
        dateOnly,
        startMinute,
        durationMinutes,
        bufferTimeMinutes: settings.bufferTimeMinutes,
      });
      if (!slotOk && !input.isWaiting) {
        throw new BadRequestException(
          APPOINTMENT_ERROR_CODES.APPOINTMENT_SLOT_UNAVAILABLE,
        );
      }

      const isConfirmed = status === AppointmentStatus.CONFIRMED;

      const appointment = await tx.appointment.create({
        data: {
          patientId: input.patientId,
          createdById,
          treatmentSessionId: sessionId,
          type: input.type,
          scheduledAt,
          durationMinutes,
          status,
          isWaiting: input.isWaiting,
          reasonForVisit: input.reasonForVisit,
          chatbotSummary: input.chatbotSummary,
          notes: input.notes,
          confirmedAt: isConfirmed ? new Date() : null,
          confirmedById: isConfirmed ? createdById : null,
        },
        select: appointmentSelect(),
      });

      if (
        sessionId != null &&
        (
          APPOINTMENT_STATUSES_THAT_BOOK_SESSION as readonly AppointmentStatus[]
        ).includes(status)
      ) {
        await tx.treatmentSession.update({
          where: { id: sessionId },
          data: { status: TreatmentSessionStatus.BOOKED },
        });
      }

      return appointment;
    });

    return this.adapter.adapt(created);
  }

  private assertTypeSessionPair(
    type: AppointmentType,
    treatmentSessionId: number | null,
  ) {
    if (type === AppointmentType.CONSULTATION && treatmentSessionId != null) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_TYPE_SESSION_MISMATCH,
      );
    }
    if (type === AppointmentType.FOLLOW_UP && treatmentSessionId == null) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.TREATMENT_SESSION_REQUIRED,
      );
    }
  }

  private async assertNoActiveConsultation(patientId: number) {
    const open = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        type: AppointmentType.CONSULTATION,
        status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
      },
      select: { id: true },
    });
    if (open) {
      throw new BadRequestException(
        APPOINTMENT_ERROR_CODES.ACTIVE_CONSULTATION_EXISTS,
      );
    }
  }
}
