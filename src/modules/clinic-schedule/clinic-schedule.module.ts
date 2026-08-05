import { Module } from '@nestjs/common';
import { ClinicScheduleAdapter } from './adapter/clinic-schedule.adapter';
import { ClinicScheduleDashboardController } from './controllers/clinic-schedule-dashboard.controller';
import { ClinicScheduleSharedController } from './controllers/clinic-schedule-shared.controller';
import { ClinicScheduleService } from './services/clinic-schedule.service';

@Module({
  controllers: [
    ClinicScheduleDashboardController,
    ClinicScheduleSharedController,
  ],
  providers: [ClinicScheduleService, ClinicScheduleAdapter],
  exports: [ClinicScheduleService],
})
export class ClinicScheduleModule {}
