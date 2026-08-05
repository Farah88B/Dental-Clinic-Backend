import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { toUiLanguage } from 'src/common/i18n/localize.helper';
import { TreatmentSessionTemplateAdapter } from '../adapter/treatment-session-template.adapter';
import { treatmentSessionTemplateSelect } from '../selectors/treatment-session-template.select';
import { CreateTreatmentSessionTemplateDto } from '../dto/create-treatment-session-template.dto';
import { UpdateTreatmentSessionTemplateDto } from '../dto/update-treatment-session-template.dto';
import { TreatmentPlanTemplatesService } from './treatment-plan-templates.service';

@Injectable()
export class TreatmentSessionTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionTemplateAdapter: TreatmentSessionTemplateAdapter,
    private readonly planTemplatesService: TreatmentPlanTemplatesService,
  ) {}

  async listForPlan(planTemplateId: number, preferredLanguage?: string) {
    const language = toUiLanguage(preferredLanguage);
    await this.prisma.treatmentPlanTemplate.findUniqueOrThrow({
      where: { id: planTemplateId },
    });

    const sessions = await this.prisma.treatmentSessionTemplate.findMany({
      where: { planTemplateId, isActive: true },
      select: treatmentSessionTemplateSelect(),
      orderBy: { sessionOrder: 'asc' },
    });

    return this.sessionTemplateAdapter.fromArray(sessions, language);
  }

  async create(
    planTemplateId: number,
    dto: CreateTreatmentSessionTemplateDto,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    await this.prisma.treatmentPlanTemplate.findUniqueOrThrow({
      where: { id: planTemplateId },
    });

    // No manual duplicate sessionOrder check — @@unique([planTemplateId, sessionOrder])
    // raises P2002, translated to 409 by PrismaExceptionFilter.
    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.treatmentSessionTemplate.create({
        data: {
          planTemplateId,
          titleAr: dto.titleAr,
          titleEn: dto.titleEn,
          sessionOrder: dto.sessionOrder,
          durationMinutes: dto.durationMinutes,
          minDaysBeforeBooking: dto.minDaysBeforeBooking,
          estimatedCost: dto.estimatedCost,
        },
        select: treatmentSessionTemplateSelect(),
      });

      await this.planTemplatesService.recalculateCost(planTemplateId, tx);

      return created;
    });

    return this.sessionTemplateAdapter.adapt(session, language);
  }

  async update(
    id: number,
    dto: UpdateTreatmentSessionTemplateDto,
    preferredLanguage?: string,
  ) {
    const language = toUiLanguage(preferredLanguage);
    const existing = await this.prisma.treatmentSessionTemplate.findUniqueOrThrow({
      where: { id },
      select: { planTemplateId: true },
    });

    const session = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.treatmentSessionTemplate.update({
        where: { id },
        data: dto,
        select: treatmentSessionTemplateSelect(),
      });

      await this.planTemplatesService.recalculateCost(existing.planTemplateId, tx);

      return updated;
    });

    return this.sessionTemplateAdapter.adapt(session, language);
  }

  // Soft delete — session template retained with isActive=false.
  async delete(id: number): Promise<void> {
    const existing = await this.prisma.treatmentSessionTemplate.findUniqueOrThrow({
      where: { id },
      select: { planTemplateId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.treatmentSessionTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      await this.planTemplatesService.recalculateCost(existing.planTemplateId, tx);
    });
  }
}
