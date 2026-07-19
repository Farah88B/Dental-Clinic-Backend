import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { ClinicSettingsResponseDto } from '../dto/clinic-settings-response.dto';
import { RawClinicSettings } from '../selectors/clinic-settings.select';

@Injectable()
export class ClinicSettingsAdapter
  implements Adapter<ClinicSettingsResponseDto, RawClinicSettings>
{
  async adapt(raw: RawClinicSettings): Promise<ClinicSettingsResponseDto> {
    return new ClinicSettingsResponseDto(raw);
  }
  async fromArray(raws: RawClinicSettings[]) {
    return Promise.all(raws.map((r) => this.adapt(r)));
  }
}