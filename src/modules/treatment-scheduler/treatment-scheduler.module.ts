import { Module } from '@nestjs/common';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { TreatmentSchedulerService } from './services/treatment-scheduler.service';

@Module({
  imports: [NotificationModule],
  providers: [TreatmentSchedulerService],
})
export class TreatmentSchedulerModule {}
