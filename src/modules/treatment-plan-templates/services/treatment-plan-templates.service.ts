import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import {
  TREATMENT_CONSTANTS,
} from 'src/common/constants/treatment.constants';
import {
  toUiLanguage,
} from 'src/common/i18n/localize.helper';
import { TreatmentPlanTemplateAdapter } from '../adapter/treatment-plan-template.adapter';
import {
  treatmentPlanTemplateListSelect,
  treatmentPlanTemplateSelect,
} from '../selectors/treatment-plan-template.select';
import { CreateTreatmentPlanTemplateDto } from '../dto/create-treatment-plan-template.dto';
import { UpdateTreatmentPlanTemplateDto } from '../dto/update-treatment-plan-template.dto';
import { CreateTreatmentSessionTemplateDto } from '../dto/create-treatment-session-template.dto';

@Injectable()
export class TreatmentPlanTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planTemplateAdapter: TreatmentPlanTemplateAdapter,
  ) {}

  async list(pagination: PaginationDto, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const [templates, total] = await Promise.all([
      this.prisma.treatmentPlanTemplate.findMany({
        select: treatmentPlanTemplateListSelect(),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.treatmentPlanTemplate.count(),
    ]);
    const items = await this.planTemplateAdapter.fromArray(templates, language);
    return new AdminListDto(items, total);
  }

  async getById(id: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const template = await this.prisma.treatmentPlanTemplate.findUniqueOrThrow({
      where: { id },
      select: treatmentPlanTemplateSelect(),
    });
    return this.planTemplateAdapter.adapt(template, language);
  }

  async create(
    dto: CreateTreatmentPlanTemplateDto,
    createdByAccountId: number,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const sessions = this.ensureConsultationSession(dto.sessions ?? []);
    const estimatedCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0);

    const template = await this.prisma.treatmentPlanTemplate.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        createdByAccountId,
        estimatedCost,
        ...(sessions.length > 0 && {
          sessionTemplates: {
            create: sessions.map((session) => ({
              titleAr: session.titleAr,
              titleEn: session.titleEn,
              sessionOrder: session.sessionOrder,
              durationMinutes: session.durationMinutes,
              minDaysBeforeBooking: session.minDaysBeforeBooking,
              estimatedCost: session.estimatedCost,
            })),
          },
        }),
      },
      select: treatmentPlanTemplateSelect(),
    });
    return this.planTemplateAdapter.adapt(template, language);
  }

  async update(
    id: number,
    dto: UpdateTreatmentPlanTemplateDto,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const template = await this.prisma.treatmentPlanTemplate.update({
      where: { id },
      data: {
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost }),
      },
      select: treatmentPlanTemplateSelect(),
    });
    return this.planTemplateAdapter.adapt(template, language);
  }

  // Soft delete only — template data is retained with isActive=false.
  async archive(id: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    const template = await this.prisma.treatmentPlanTemplate.update({
      where: { id },
      data: { isActive: false },
      select: treatmentPlanTemplateSelect(),
    });
    return this.planTemplateAdapter.adapt(template, language);
  }

  /**
   * Recomputes TreatmentPlanTemplate.estimatedCost as SUM(active session.estimatedCost)
   * inside the caller's transaction after any session create/update/delete.
   */
  async recalculateCost(
    planTemplateId: number,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const result = await tx.treatmentSessionTemplate.aggregate({
      where: { planTemplateId, isActive: true },
      _sum: { estimatedCost: true },
    });

    await tx.treatmentPlanTemplate.update({
      where: { id: planTemplateId },
      data: { estimatedCost: result._sum.estimatedCost ?? 0 },
    });
  }

  private ensureConsultationSession(
    sessions: CreateTreatmentSessionTemplateDto[],
  ): CreateTreatmentSessionTemplateDto[] {
    if (sessions.length === 0) {
      return [];
    }

    const hasOrderOne = sessions.some((session) => session.sessionOrder === 1);
    if (hasOrderOne) {
      return [...sessions].sort((a, b) => a.sessionOrder - b.sessionOrder);
    }

    return [
      {
        titleAr: TREATMENT_CONSTANTS.CONSULTATION_TITLE_AR,
        titleEn: TREATMENT_CONSTANTS.CONSULTATION_TITLE_EN,
        sessionOrder: 1,
        estimatedCost: 0,
        minDaysBeforeBooking: 0,
      },
      ...sessions,
    ].sort((a, b) => a.sessionOrder - b.sessionOrder);
  }
}
