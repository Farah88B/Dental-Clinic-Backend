import { Injectable } from '@nestjs/common';
import { TreatmentSessionStatus } from '@prisma/client';
import { pickLocalized, UiLanguage } from 'src/common/i18n/localize.helper';
import {
  TreatmentPlanResponseDto,
  TreatmentPlanTemplateSummaryResponseDto,
} from '../dto/treatment-plan-response.dto';
import { RawTreatmentPlanSelect } from '../selectors/treatment-plan.select';
import { TreatmentSessionAdapter } from 'src/modules/treatment-sessions/adapter/treatment-session.adapter';

@Injectable()
export class TreatmentPlanAdapter {
  constructor(private readonly sessionAdapter: TreatmentSessionAdapter) {}

  async adapt(
    raw: RawTreatmentPlanSelect,
    language: UiLanguage,
  ): Promise<TreatmentPlanResponseDto> {
    const nonCancelled = raw.sessions.filter(
      (s) => s.status !== TreatmentSessionStatus.CANCELLED,
    );
    const completedSessions = nonCancelled.filter(
      (s) => s.status === TreatmentSessionStatus.COMPLETED,
    ).length;
    const totalSessions = nonCancelled.length;
    const progressPercent =
      totalSessions === 0
        ? 0
        : Math.round((completedSessions / totalSessions) * 100);

    return new TreatmentPlanResponseDto({
      id: raw.id,
      patientId: raw.patientId,
      createdByAccountId: raw.createdByAccountId,
      templateId: raw.templateId,
      name: raw.template
        ? null
        : pickLocalized(raw.nameAr ?? '', raw.nameEn ?? '', language),
      template: raw.template
        ? new TreatmentPlanTemplateSummaryResponseDto({
            id: raw.template.id,
            name: pickLocalized(raw.template.nameAr, raw.template.nameEn, language),
          })
        : null,
      status: raw.status,
      estimatedCost: raw.estimatedCost.toString(),
      actualCost: raw.actualCost.toString(),
      isActive: raw.isActive,
      progressPercent,
      completedSessions,
      totalSessions,
      sessions: await this.sessionAdapter.fromArray(raw.sessions, language),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(
    raws: RawTreatmentPlanSelect[],
    language: UiLanguage,
  ): Promise<TreatmentPlanResponseDto[]> {
    return Promise.all(raws.map((r) => this.adapt(r, language)));
  }
}
