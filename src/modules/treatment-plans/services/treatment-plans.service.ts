import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  Prisma,
  TreatmentPlanStatus,
  TreatmentSessionStatus,
} from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import {
  TREATMENT_CONSTANTS,
  TREATMENT_ERROR_CODES,
} from 'src/common/constants/treatment.constants';
import { toUiLanguage } from 'src/common/i18n/localize.helper';
import { TreatmentPlanAdapter } from '../adapter/treatment-plan.adapter';
import { treatmentPlanSelect } from '../selectors/treatment-plan.select';
import { CreateTreatmentPlanDto } from '../dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from '../dto/update-treatment-plan.dto';
import { APPOINTMENT_STATUSES_THAT_BOOK_SESSION } from 'src/modules/treatment-sessions/helpers/session-flags.helper';

@Injectable()
export class TreatmentPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planAdapter: TreatmentPlanAdapter,
  ) {}

  async list(
    pagination: PaginationDto,
    patientId?: number,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const where: Prisma.TreatmentPlanWhereInput = {
      ...(patientId !== undefined && { patientId }),
    };

    const [plans, total] = await Promise.all([
      this.prisma.treatmentPlan.findMany({
        where,
        select: treatmentPlanSelect(),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.treatmentPlan.count({ where }),
    ]);

    return new AdminListDto(await this.planAdapter.fromArray(plans, language), total);
  }

  async getById(id: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const plan = await this.prisma.treatmentPlan.findUniqueOrThrow({
      where: { id },
      select: treatmentPlanSelect(),
    });
    return this.planAdapter.adapt(plan, language);
  }

  async create(
    dto: CreateTreatmentPlanDto,
    createdByAccountId: number,
    preferredLanguage?: string,
  ) {
    await this.prisma.patient.findUniqueOrThrow({ where: { id: dto.patientId } });

    if (dto.templateId != null) {
      return this.createFromTemplate(dto, createdByAccountId, preferredLanguage);
    }

    return this.createManual(dto, createdByAccountId, preferredLanguage);
  }

  async update(
    id: number,
    dto: UpdateTreatmentPlanDto,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    if (dto.status !== undefined && dto.status !== TreatmentPlanStatus.CANCELLED) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.PLAN_STATUS_MUST_BE_CANCELLED);
    }

    const plan = await this.prisma.treatmentPlan.update({
      where: { id },
      data: dto,
      select: treatmentPlanSelect(),
    });
    return this.planAdapter.adapt(plan, language);
  }

  async archive(id: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const plan = await this.prisma.treatmentPlan.update({
      where: { id },
      data: { isActive: false, status: TreatmentPlanStatus.CANCELLED },
      select: treatmentPlanSelect(),
    });
    return this.planAdapter.adapt(plan, language);
  }

  /**
   * Recomputes plan totals:
   * - estimatedCost = SUM(all sessions.estimatedCost)
   * - actualCost    = SUM(sessions.actualCost where not null) — typically completed only
   */
  async recalculateCost(planId: number, tx: Prisma.TransactionClient): Promise<void> {
    const [estimated, actual] = await Promise.all([
      tx.treatmentSession.aggregate({
        where: { treatmentPlanId: planId },
        _sum: { estimatedCost: true },
      }),
      tx.treatmentSession.aggregate({
        where: {
          treatmentPlanId: planId,
          actualCost: { not: null },
        },
        _sum: { actualCost: true },
      }),
    ]);

    await tx.treatmentPlan.update({
      where: { id: planId },
      data: {
        estimatedCost: estimated._sum.estimatedCost ?? 0,
        actualCost: actual._sum.actualCost ?? 0,
      },
    });
  }

  private async createManual(
    dto: CreateTreatmentPlanDto,
    createdByAccountId: number,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const settings = await this.prisma.clinicSettings.findFirstOrThrow();

    if (!dto.nameAr?.trim() || !dto.nameEn?.trim()) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.PLAN_NAME_REQUIRED);
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.treatmentPlan.create({
        data: {
          patientId: dto.patientId,
          createdByAccountId,
          nameAr: dto.nameAr ? dto.nameAr.trim() : null,
          nameEn: dto.nameEn ? dto.nameEn.trim() : null,
          status: TreatmentPlanStatus.ACTIVE,
          sessions: {
            create: {
              titleAr: TREATMENT_CONSTANTS.CONSULTATION_TITLE_AR,
              titleEn: TREATMENT_CONSTANTS.CONSULTATION_TITLE_EN,
              sessionOrder: 1,
              durationMinutes: settings.defaultConsultationDurationMinutes,
              estimatedCost: 0,
              minDaysBeforeBooking: 0,
              status: TreatmentSessionStatus.PENDING,
              availableForBookingAt: new Date(),
            },
          },
        },
        select: treatmentPlanSelect(),
      });

      await this.linkAppointmentIfProvided(tx, dto, created.sessions[0]?.id);

      return tx.treatmentPlan.findUniqueOrThrow({
        where: { id: created.id },
        select: treatmentPlanSelect(),
      });
    });

    return this.planAdapter.adapt(plan, language);
  }

  private async createFromTemplate(
    dto: CreateTreatmentPlanDto,
    createdByAccountId: number,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const template = await this.prisma.treatmentPlanTemplate.findUniqueOrThrow({
      where: { id: dto.templateId! },
      include: {
        sessionTemplates: {
          where: { isActive: true },
          orderBy: { sessionOrder: 'asc' },
        },
      },
    });

    if (!template.sessionTemplates.length) {
      throw new BadRequestException(TREATMENT_ERROR_CODES.TEMPLATE_HAS_NO_SESSIONS);
    }

    const settings = await this.prisma.clinicSettings.findFirstOrThrow();
    let sessions = [...template.sessionTemplates];

    if (!sessions.some((s) => s.sessionOrder === 1)) {
      sessions = [
        {
          id: 0,
          planTemplateId: template.id,
          titleAr: TREATMENT_CONSTANTS.CONSULTATION_TITLE_AR,
          titleEn: TREATMENT_CONSTANTS.CONSULTATION_TITLE_EN,
          sessionOrder: 1,
          durationMinutes: settings.defaultConsultationDurationMinutes,
          minDaysBeforeBooking: 0,
          estimatedCost: new Prisma.Decimal(0),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...sessions,
      ];
    }

    const estimatedCost = sessions.reduce(
      (sum, s) => sum + Number(s.estimatedCost),
      0,
    );

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.treatmentPlan.create({
        data: {
          patientId: dto.patientId,
          createdByAccountId,
          templateId: template.id,
          status: TreatmentPlanStatus.ACTIVE,
          estimatedCost,
          sessions: {
            create: sessions.map((s) => {
              const isFirst = s.sessionOrder === 1;
              return {
                titleAr: s.titleAr,
                titleEn: s.titleEn,
                sessionOrder: s.sessionOrder,
                durationMinutes:
                  s.durationMinutes ??
                  (isFirst ? settings.defaultConsultationDurationMinutes : null),
                minDaysBeforeBooking: s.minDaysBeforeBooking ?? 0,
                estimatedCost: s.estimatedCost,
                status: TreatmentSessionStatus.PENDING,
                availableForBookingAt: isFirst ? new Date() : null,
              };
            }),
          },
        },
        select: treatmentPlanSelect(),
      });

      const sessionOne = created.sessions.find((s) => s.sessionOrder === 1);
      await this.linkAppointmentIfProvided(tx, dto, sessionOne?.id);

      return tx.treatmentPlan.findUniqueOrThrow({
        where: { id: created.id },
        select: treatmentPlanSelect(),
      });
    });

    return this.planAdapter.adapt(plan, language);
  }

  private async linkAppointmentIfProvided(
    tx: Prisma.TransactionClient,
    dto: CreateTreatmentPlanDto,
    sessionId?: number,
  ) {
    if (!dto.appointmentId || !sessionId) {
      return;
    }

    const appointment = await tx.appointment.findUniqueOrThrow({
      where: { id: dto.appointmentId },
    });

    if (appointment.patientId !== dto.patientId) {
      throw new BadRequestException(
        TREATMENT_ERROR_CODES.APPOINTMENT_PATIENT_MISMATCH,
      );
    }

    await tx.appointment.update({
      where: { id: dto.appointmentId },
      data: { treatmentSessionId: sessionId },
    });

    if (
      (APPOINTMENT_STATUSES_THAT_BOOK_SESSION as readonly AppointmentStatus[]).includes(
        appointment.status,
      )
    ) {
      await tx.treatmentSession.update({
        where: { id: sessionId },
        data: { status: TreatmentSessionStatus.BOOKED },
      });
    }
  }

  /**
   * When an appointment becomes CONFIRMED (or CHECKED_IN / IN_TREATMENT),
   * mark the linked session BOOKED. Callable from appointments module.
   */
  async markSessionBookedIfConfirmed(appointmentId: number): Promise<void> {
    const appointment = await this.prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
    });

    if (!appointment.treatmentSessionId) {
      return;
    }

    if (
      !(
        APPOINTMENT_STATUSES_THAT_BOOK_SESSION as readonly AppointmentStatus[]
      ).includes(appointment.status)
    ) {
      return;
    }

    await this.prisma.treatmentSession.update({
      where: { id: appointment.treatmentSessionId },
      data: { status: TreatmentSessionStatus.BOOKED },
    });
  }
}
