import { Module } from '@nestjs/common';
import { ClinicSettingsController } from './controllers/clinic-settings.controller';
import { ClinicSettingsService } from './services/clinic-settings.service';
import { ClinicSettingsAdapter } from './adapter/clinic-settings.adapter';

@Module({
  controllers: [ClinicSettingsController],
  providers: [ClinicSettingsService, ClinicSettingsAdapter],
  exports: [ClinicSettingsService],
})
export class ClinicSettingsModule {}