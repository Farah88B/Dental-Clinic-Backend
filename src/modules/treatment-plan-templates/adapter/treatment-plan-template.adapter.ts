import { Injectable } from '@nestjs/common';
import {
  pickLocalized,
  UiLanguage,
} from 'src/common/i18n/localize.helper';
import { TreatmentPlanTemplateResponseDto } from '../dto/treatment-plan-template-response.dto';
import {
  RawTreatmentPlanTemplateListSelect,
  RawTreatmentPlanTemplateSelect,
} from '../selectors/treatment-plan-template.select';
import { TreatmentSessionTemplateAdapter } from './treatment-session-template.adapter';

type PlanTemplateRaw =
  | RawTreatmentPlanTemplateSelect
  | RawTreatmentPlanTemplateListSelect;

@Injectable()
export class TreatmentPlanTemplateAdapter {
  constructor(
    private readonly sessionTemplateAdapter: TreatmentSessionTemplateAdapter,
  ) {}

  async adapt(
    raw: PlanTemplateRaw,
    language: UiLanguage,
  ): Promise<TreatmentPlanTemplateResponseDto> {
    const hasSessions = 'sessionTemplates' in raw && Array.isArray(raw.sessionTemplates);
    const sessionTemplates = hasSessions
      ? await this.sessionTemplateAdapter.fromArray(raw.sessionTemplates, language)
      : [];

    const sessionCount =
      '_count' in raw && raw._count
        ? raw._count.sessionTemplates
        : sessionTemplates.length;

    return new TreatmentPlanTemplateResponseDto({
      id: raw.id,
      name: pickLocalized(raw.nameAr, raw.nameEn, language),
      estimatedCost: raw.estimatedCost.toString(),
      createdByAccountId: raw.createdByAccountId,
      isActive: raw.isActive,
      sessionCount,
      sessionTemplates,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(
    raws: PlanTemplateRaw[],
    language: UiLanguage,
  ): Promise<TreatmentPlanTemplateResponseDto[]> {
    return Promise.all(raws.map((r) => this.adapt(r, language)));
  }
}
