import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { PermissionResponseDto } from '../dto/permission-response.dto';
import { RawPermissionSelect } from '../selectors/permission.select';

@Injectable()
export class PermissionAdapter
  implements Adapter<PermissionResponseDto, RawPermissionSelect>
{
  async adapt(raw: RawPermissionSelect): Promise<PermissionResponseDto> {
    return new PermissionResponseDto({
      id: raw.id,
      code: raw.code,
      nameAr: raw.nameAr,
      nameEn: raw.nameEn,
      descriptionAr: raw.descriptionAr,
      descriptionEn: raw.descriptionEn,
      order: raw.order,
    });
  }

  async fromArray(raws: RawPermissionSelect[]): Promise<PermissionResponseDto[]> {
    return Promise.all(raws.map((p) => this.adapt(p)));
  }
}