import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { AccountResponseDto } from '../dto/account-response.dto';
import { RawAccountSelect } from '../selectors/account.selector';

@Injectable()
export class AccountAdapter implements Adapter<AccountResponseDto, RawAccountSelect> {
  async adapt(raw: RawAccountSelect): Promise<AccountResponseDto> {
    return new AccountResponseDto({
      id: raw.id,
      phone: raw.phone,
      status: raw.status,
      biometricEnabled: raw.biometricEnabled,
      phoneVerifiedAt: raw.phoneVerifiedAt,
      createdById: raw.createdById,
      // raw.roles[].role.{id,code,nameAr,nameEn} — تصحيح المسار المتداخل
      roles: raw.roles.map((r) => ({
        id: r.role.id,
        code: r.role.code,
        nameAr: r.role.nameAr,
        nameEn: r.role.nameEn,
      })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(raws: RawAccountSelect[]): Promise<AccountResponseDto[]> {
    return Promise.all(raws.map((r) => this.adapt(r)));
  }
}