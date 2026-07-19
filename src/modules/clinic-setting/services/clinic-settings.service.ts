import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ClinicSettingsAdapter } from '../adapter/clinic-settings.adapter';
import { clinicSettingsSelect } from '../selectors/clinic-settings.select';
import { UpdateClinicSettingsDto } from '../dto/update-clinic-settings.dto';

@Injectable()
export class ClinicSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: ClinicSettingsAdapter,
  ) {}

  // Singleton: seed guarantees exactly one row exists.
  // findFirstOrThrow -> P2025 if somehow missing -> 404 via PrismaExceptionFilter
  // (a clear signal the seed didn't run, rather than a silent undefined).
  async get() {
    const settings = await this.prisma.clinicSettings.findFirstOrThrow({
      select: clinicSettingsSelect(),
    });
    return this.adapter.adapt(settings);
  }

  async update(dto: UpdateClinicSettingsDto, updatedByAccountId: number) {
    const current = await this.prisma.clinicSettings.findFirstOrThrow();
    const settings = await this.prisma.clinicSettings.update({
      where: { id: current.id },
      data: { ...dto, updatedByAccountId },
      select: clinicSettingsSelect(),
    });
    return this.adapter.adapt(settings);
  }
}