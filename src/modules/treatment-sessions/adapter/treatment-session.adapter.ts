import { Injectable } from '@nestjs/common';
import {
  pickLocalized,
  UiLanguage,
} from 'src/common/i18n/localize.helper';
import { TreatmentSessionResponseDto } from '../dto/treatment-session-response.dto';
import { RawTreatmentSessionSelect } from '../selectors/treatment-session.select';

@Injectable()
export class TreatmentSessionAdapter {
  async adapt(
    raw: RawTreatmentSessionSelect,
    language: UiLanguage,
  ): Promise<TreatmentSessionResponseDto> {
    return new TreatmentSessionResponseDto({
      id: raw.id,
      treatmentPlanId: raw.treatmentPlanId,
      title: pickLocalized(raw.titleAr, raw.titleEn, language),
      sessionOrder: raw.sessionOrder,
      durationMinutes: raw.durationMinutes,
      minDaysBeforeBooking: raw.minDaysBeforeBooking,
      estimatedCost: raw.estimatedCost.toString(),
      actualCost: raw.actualCost?.toString() ?? null,
      availableForBookingAt: raw.availableForBookingAt,
      status: raw.status,
      completedAt: raw.completedAt,
      rating: raw.rating,
      ratedAt: raw.ratedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(
    raws: RawTreatmentSessionSelect[],
    language: UiLanguage,
  ): Promise<TreatmentSessionResponseDto[]> {
    return Promise.all(raws.map((r) => this.adapt(r, language)));
  }
}
