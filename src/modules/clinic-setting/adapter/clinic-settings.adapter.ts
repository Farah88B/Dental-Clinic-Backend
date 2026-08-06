import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { ClinicSettingsResponseDto } from '../dto/clinic-settings-response.dto';
import { RawClinicSettings } from '../selectors/clinic-settings.select';

@Injectable()
export class ClinicSettingsAdapter
  implements Adapter<ClinicSettingsResponseDto, RawClinicSettings>
{
  async adapt(raw: RawClinicSettings): Promise<ClinicSettingsResponseDto> {
    return new ClinicSettingsResponseDto({
      id: raw.id,
      bufferTimeMinutes: raw.bufferTimeMinutes,
      cancelRescheduleWindowHours: raw.cancelRescheduleWindowHours,
      defaultConsultationDurationMinutes:
        raw.defaultConsultationDurationMinutes,
      reminderLeadTimeHours: raw.reminderLeadTimeHours,
      ratingValidityHours: raw.ratingValidityHours,
      autoConfirmationEnabled: raw.autoConfirmationEnabled,
      onlineBookingEnabled: raw.onlineBookingEnabled,
      maxBookingHorizonDays: raw.maxBookingHorizonDays,
      latitude: raw.latitude == null ? null : Number(raw.latitude),
      longitude: raw.longitude == null ? null : Number(raw.longitude),
      checkInRadiusMeters: raw.checkInRadiusMeters,
      updatedAt: raw.updatedAt,
    });
  }
  async fromArray(raws: RawClinicSettings[]) {
    return Promise.all(raws.map((r) => this.adapt(r)));
  }
}
