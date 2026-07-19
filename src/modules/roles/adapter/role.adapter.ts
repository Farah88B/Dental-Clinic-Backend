import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { RoleResponseDto } from '../dto/role-response.dto';
import { RawRoleSelect } from '../selectors/role.select';

@Injectable()
export class RoleAdapter implements Adapter<RoleResponseDto, RawRoleSelect> {
  async adapt(raw: RawRoleSelect): Promise<RoleResponseDto> {
    return new RoleResponseDto({
      id: raw.id,
      code: raw.code,
      nameAr: raw.nameAr,
      nameEn: raw.nameEn,
      descriptionAr: raw.descriptionAr,
      descriptionEn: raw.descriptionEn,
      permissions: raw.permissions.map((p) => ({
  id: p.permission.id,
  code: p.permission.code,
  nameAr: p.permission.nameAr,
  nameEn: p.permission.nameEn,
  order: p.permission.order,
})),
      createdAt: raw.createdAt,
    });
  }

  async fromArray(raws: RawRoleSelect[]): Promise<RoleResponseDto[]> {
    return Promise.all(raws.map((r) => this.adapt(r)));
  }
}