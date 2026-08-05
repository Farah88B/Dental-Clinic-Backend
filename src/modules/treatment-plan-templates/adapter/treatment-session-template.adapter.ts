import { Injectable } from '@nestjs/common';
import {
  pickLocalized,
  UiLanguage,
} from 'src/common/i18n/localize.helper';
import { TreatmentSessionTemplateResponseDto } from '../dto/treatment-session-template-response.dto';
import { RawTreatmentSessionTemplateSelect } from '../selectors/treatment-session-template.select';

@Injectable()
export class TreatmentSessionTemplateAdapter {
  async adapt(
    raw: RawTreatmentSessionTemplateSelect,
    language: UiLanguage,
  ): Promise<TreatmentSessionTemplateResponseDto> {
    return new TreatmentSessionTemplateResponseDto({
      id: raw.id,
      planTemplateId: raw.planTemplateId,
      title: pickLocalized(raw.titleAr, raw.titleEn, language),
      sessionOrder: raw.sessionOrder,
      durationMinutes: raw.durationMinutes,
      minDaysBeforeBooking: raw.minDaysBeforeBooking,
      estimatedCost: raw.estimatedCost.toString(),
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(
    raws: RawTreatmentSessionTemplateSelect[],
    language: UiLanguage,
  ): Promise<TreatmentSessionTemplateResponseDto[]> {
    return Promise.all(raws.map((r) => this.adapt(r, language)));
  }
}
