import { Module } from '@nestjs/common';
import { TreatmentSchedulerService } from './services/treatment-scheduler.service';

@Module({
  providers: [TreatmentSchedulerService],
})
export class TreatmentSchedulerModule {}
