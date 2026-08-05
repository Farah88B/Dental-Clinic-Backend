import {
  Inject,
  Injectable,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  EncounterStatus,
  Prisma,
  TreatmentSessionStatus,
} from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import {
  TREATMENT_CONSTANTS,
  TREATMENT_ERROR_CODES,
} from 'src/common/constants/treatment.constants';
import {
  pickLocalized,
  toUiLanguage,
  UiLanguage,
} from 'src/common/i18n/localize.helper';
import { TreatmentSessionAdapter } from '../adapter/treatment-session.adapter';
import { treatmentSessionSelect } from '../selectors/treatment-session.select';
import { CreateTreatmentSessionDto } from '../dto/create-treatment-session.dto';
import { UpdateTreatmentSessionDto } from '../dto/update-treatment-session.dto';
import { CompleteTreatmentSessionDto } from '../dto/complete-treatment-session.dto';
import { RateTreatmentSessionDto } from '../dto/rate-treatment-session.dto';
import {
  NextPendingSessionDto,
  StartTreatmentSessionResponseDto,
} from '../dto/start-treatment-session-response.dto';
import { TreatmentPlansService } from 'src/modules/treatment-plans/services/treatment-plans.service';
import { EncounterAdapter } from 'src/modules/encounters/adapter/encounter.adapter';
import { encounterSelect } from 'src/modules/encounters/selectors/encounter.select';
import { computeCanTreat } from '../helpers/session-flags.helper';

@Injectable()
export class TreatmentSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionAdapter: TreatmentSessionAdapter,
    @Inject(forwardRef(() => TreatmentPlansService))
    private readonly planService: TreatmentPlansService,
    private readonly encounterAdapter: EncounterAdapter,
  ) {}

  private getRatingCanRateUntil(
    completedAt: Date,
    ratingValidityHours: number,
  ): Date {
    const canRateUntil = new Date(completedAt);
    canRateUntil.setHours(canRateUntil.getHours() + ratingValidityHours);

    return canRateUntil;
  }

  private async resolvePendingRatingForPatient(patientId: number) {
    const session = await this.prisma.treatmentSession.findFirst({
      where: {
        status: TreatmentSessionStatus.COMPLETED,
        rating: null,
        completedAt: { not: null },
        treatmentPlan: { patientId },
      },
      orderBy: { completedAt: 'desc' },
      select: treatmentSessionSelect(),
    });

    if (!session?.completedAt) {
      return null;
    }

    const settings = await this.prisma.clinicSettings.findFirstOrThrow();
    const canRateUntil = this.getRatingCanRateUntil(
      session.completedAt,
      settings.ratingValidityHours,
    );

    if (new Date() >= canRateUntil) {
      return null;
    }

    return { session, canRateUntil };
  }

  private buildSuggestedBookingDate(
    availableForBookingAt: Date | null,
    minDaysBeforeBooking: number | null,
  ): Date {
    if (availableForBookingAt) {
      return availableForBookingAt;
    }

    const suggested = new Date();
    suggested.setDate(suggested.getDate() + (minDaysBeforeBooking ?? 0));
    return suggested;
  }

  private toNextPendingSessionDto(
    session: {
      id: number;
      sessionOrder: number;
      titleAr: string;
      titleEn: string;
      durationMinutes: number | null;
      estimatedCost: { toString(): string };
      minDaysBeforeBooking: number | null;
      availableForBookingAt: Date | null;
    },
    language: UiLanguage,
  ): NextPendingSessionDto {
    return new NextPendingSessionDto({
      id: session.id,
      sessionOrder: session.sessionOrder,
      title: pickLocalized(session.titleAr, session.titleEn, language),
      durationMinutes: session.durationMinutes,
      estimatedCost: session.estimatedCost.toString(),
      minDaysBeforeBooking: session.minDaysBeforeBooking,
      availableForBookingAt: session.availableForBookingAt,
      suggestedBookingDate: this.buildSuggestedBookingDate(
        session.availableForBookingAt,
        session.minDaysBeforeBooking,
      ),
    });
  }

  async listForPlan(treatmentPlanId: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    await this.prisma.treatmentPlan.findUniqueOrThrow({
      where: { id: treatmentPlanId },
    });

    const sessions = await this.prisma.treatmentSession.findMany({
      where: { treatmentPlanId },
      select: treatmentSessionSelect(),
      orderBy: { sessionOrder: 'asc' },
    });

    return this.sessionAdapter.fromArray(sessions, language);
  }

  async create(
    treatmentPlanId: number,
    dto: CreateTreatmentSessionDto,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    await this.prisma.treatmentPlan.findUniqueOrThrow({
      where: { id: treatmentPlanId },
    });

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.treatmentSession.create({
        data: {
          treatmentPlanId,
          titleAr: dto.titleAr,
          titleEn: dto.titleEn,
          sessionOrder: dto.sessionOrder,
          durationMinutes: dto.durationMinutes,
          minDaysBeforeBooking: dto.minDaysBeforeBooking ?? 0,
          estimatedCost: dto.estimatedCost,
          status: TreatmentSessionStatus.PENDING,
        },
        select: treatmentSessionSelect(),
      });

      await this.planService.recalculateCost(treatmentPlanId, tx);
      return created;
    });

    return this.sessionAdapter.adapt(session, language);
  }

  async update(
    id: number,
    dto: UpdateTreatmentSessionDto,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const existing = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id },
      select: { treatmentPlanId: true, status: true },
    });

    if (
      existing.status === TreatmentSessionStatus.IN_TREATMENT ||
      existing.status === TreatmentSessionStatus.COMPLETED ||
      existing.status === TreatmentSessionStatus.CANCELLED
    ) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.SESSION_NOT_UPDATABLE);
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.treatmentSession.update({
        where: { id },
        data: dto,
        select: treatmentSessionSelect(),
      });
      await this.planService.recalculateCost(existing.treatmentPlanId, tx);
      return updated;
    });

    return this.sessionAdapter.adapt(session, language);
  }

  async delete(id: number): Promise<void> {
    const existing = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id },
      select: { treatmentPlanId: true, status: true },
    });

    if (
      existing.status === TreatmentSessionStatus.IN_TREATMENT ||
      existing.status === TreatmentSessionStatus.COMPLETED
    ) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.SESSION_NOT_COMPLETABLE);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.treatmentSession.delete({ where: { id } });
      await this.planService.recalculateCost(existing.treatmentPlanId, tx);
    });
  }

  async start(
    id: number,
    preferredLanguage?: string,
  ): Promise<StartTreatmentSessionResponseDto> {
    const language = toUiLanguage(preferredLanguage);
    const session = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id },
    });

    if (session.status !== TreatmentSessionStatus.BOOKED) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.SESSION_NOT_STARTABLE);
    }

    const linkedAppointment = await this.prisma.appointment.findFirst({
      where: { treatmentSessionId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!computeCanTreat(session, linkedAppointment)) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.SESSION_NOT_STARTABLE);
    }

    const encounter = await this.prisma.$transaction(async (tx) => {
      await tx.treatmentSession.update({
        where: { id },
        data: { status: TreatmentSessionStatus.IN_TREATMENT },
      });

      await tx.appointment.updateMany({
        where: {
          treatmentSessionId: id,
          status: {
            in: [
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.CHECKED_IN,
              AppointmentStatus.IN_TREATMENT,
            ],
          },
        },
        data: { status: AppointmentStatus.IN_TREATMENT },
      });

      const existingEncounter = await tx.encounter.findUnique({
        where: { treatmentSessionId: id },
        select: encounterSelect(),
      });

      if (existingEncounter) {
        return existingEncounter;
      }

      return tx.encounter.create({
        data: {
          treatmentSessionId: id,
          appointmentId: linkedAppointment?.id ?? null,
          status: EncounterStatus.IN_TREATMENT,
          teeth: this.emptyTeethArray(),
        },
        select: encounterSelect(),
      });
    });

    const nextSession = await this.prisma.treatmentSession.findFirst({
      where: {
        treatmentPlanId: session.treatmentPlanId,
        sessionOrder: { gt: session.sessionOrder },
        status: TreatmentSessionStatus.PENDING,
      },
      orderBy: { sessionOrder: 'asc' },
    });

    return new StartTreatmentSessionResponseDto({
      encounter: await this.encounterAdapter.adapt(encounter),
      nextSession: nextSession
        ? this.toNextPendingSessionDto(nextSession, language)
        : null,
    });
  }

  async complete(
    id: number,
    dto: CompleteTreatmentSessionDto = {},
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const session = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id },
    });

    if (session.status !== TreatmentSessionStatus.IN_TREATMENT) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.SESSION_NOT_COMPLETABLE);
    }

    if (dto.teeth && dto.teeth.length !== TREATMENT_CONSTANTS.TEETH_COUNT) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.INVALID_TEETH_LENGTH);
    }

    const completedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.treatmentSession.update({
        where: { id },
        data: {
          status: TreatmentSessionStatus.COMPLETED,
          completedAt,
          ...(dto.actualCost !== undefined && { actualCost: dto.actualCost }),
        },
      });

      await tx.encounter.update({
        where: { treatmentSessionId: id },
        data: {
          status: EncounterStatus.COMPLETED,
          ...(dto.diagnosis !== undefined && { diagnosis: dto.diagnosis }),
          ...(dto.clinicalNotes !== undefined && {
            clinicalNotes: dto.clinicalNotes,
          }),
          ...(dto.prescription !== undefined && {
            prescription: dto.prescription,
          }),
          ...(dto.teeth !== undefined && { teeth: dto.teeth as object[] }),
        },
      });

      await tx.appointment.updateMany({
        where: { treatmentSessionId: id },
        data: {
          status: AppointmentStatus.COMPLETED,
          completedAt,
        },
      });

      const nextSession = await tx.treatmentSession.findFirst({
        where: {
          treatmentPlanId: session.treatmentPlanId,
          sessionOrder: { gt: session.sessionOrder },
          status: TreatmentSessionStatus.PENDING,
        },
        orderBy: { sessionOrder: 'asc' },
      });

      if (nextSession) {
        const minDays =
          dto.nextMinDaysBeforeBooking ?? nextSession.minDaysBeforeBooking ?? 0;
        const availableForBookingAt = new Date(completedAt);
        availableForBookingAt.setDate(availableForBookingAt.getDate() + minDays);

        await tx.treatmentSession.update({
          where: { id: nextSession.id },
          data: {
            ...(dto.nextDurationMinutes !== undefined && {
              durationMinutes: dto.nextDurationMinutes,
            }),
            ...(dto.nextEstimatedCost !== undefined && {
              estimatedCost: dto.nextEstimatedCost,
            }),
            minDaysBeforeBooking: minDays,
            availableForBookingAt,
          },
        });
      }

      await this.planService.recalculateCost(session.treatmentPlanId, tx);
    });
    const updated = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id },
      select: treatmentSessionSelect(),
    });

    return this.sessionAdapter.adapt(updated, language);
  }

  async cancel(id: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const session = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id },
    });

    if (
      session.status !== TreatmentSessionStatus.PENDING &&
      session.status !== TreatmentSessionStatus.BOOKED
    ) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.SESSION_NOT_CANCELLABLE);
    }

    const cancelledAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.treatmentSession.update({
        where: { id },
        data: { status: TreatmentSessionStatus.CANCELLED },
      });

      await tx.appointment.updateMany({
        where: { treatmentSessionId: id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt,
        },
      });
    });

    const updated = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id },
      select: treatmentSessionSelect(),
    });

    return this.sessionAdapter.adapt(updated, language);
  }

  async findPendingRatingForPatient(
    patientId: number,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const pending = await this.resolvePendingRatingForPatient(patientId);

    if (!pending) {
      return null;
    }

    return {
      treatmentSessionId: pending.session.id,
      completedAt: pending.session.completedAt!.toISOString(),
      canRateUntil: pending.canRateUntil.toISOString(),
      session: await this.sessionAdapter.adapt(pending.session, language),
    };
  }

  async findPendingRatingSummaryForPatient(patientId: number) {
    const pending = await this.resolvePendingRatingForPatient(patientId);

    if (!pending) {
      return null;
    }

    return {
      treatmentSessionId: pending.session.id,
      canRateUntil: pending.canRateUntil.toISOString(),
    };
  }

  async rateForPatient(
    patientId: number,
    sessionId: number,
    dto: RateTreatmentSessionDto,
    preferredLanguage?: string,
  ) {
    const session = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: {
        id: true,
        treatmentPlan: { select: { patientId: true } },
      },
    });

    if (session.treatmentPlan.patientId !== patientId) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.SESSION_NOT_RATEABLE);
    }

    return this.rate(sessionId, dto, preferredLanguage);
  }

  async rate(
    id: number,
    dto: RateTreatmentSessionDto,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const session = await this.prisma.treatmentSession.findUniqueOrThrow({
      where: { id },
    });

    if (session.status !== TreatmentSessionStatus.COMPLETED || !session.completedAt) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.SESSION_NOT_RATEABLE);
    }

    if (session.rating !== null) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.RATING_ALREADY_SUBMITTED);
    }

    const settings = await this.prisma.clinicSettings.findFirstOrThrow();
    const expiresAt = this.getRatingCanRateUntil(
      session.completedAt,
      settings.ratingValidityHours,
    );

    if (new Date() >= expiresAt) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.RATING_WINDOW_EXPIRED);
    }

    const updated = await this.prisma.treatmentSession.update({
      where: { id },
      data: { rating: dto.rating, ratedAt: new Date() },
      select: treatmentSessionSelect(),
    });

    return this.sessionAdapter.adapt(updated, language);
  }

  private emptyTeethArray(): Prisma.InputJsonValue {
    return Array.from({ length: TREATMENT_CONSTANTS.TEETH_COUNT }, (_, index) => ({
      index: index + 1,
      value: null,
    }));
  }
}
