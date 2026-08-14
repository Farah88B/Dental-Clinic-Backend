import { Module } from '@nestjs/common';
import { ClinicScheduleModule } from 'src/modules/clinic-schedule/clinic-schedule.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { AppointmentAdapter } from './adapter/appointment.adapter';
import { AppointmentAppController } from './controllers/appointment-app.controller';
import { AppointmentDashboardController } from './controllers/appointment-dashboard.controller';
import { AppointmentSharedController } from './controllers/appointment-shared.controller';
import { AppointmentAvailabilityService } from './services/appointment-availability.service';
import { AppointmentNotificationService } from './services/appointment-notification.service';
import { AppointmentNoShowScheduler } from './services/appointment-no-show.scheduler';
import { AppointmentQueryService } from './services/appointment-query.service';
import { AppointmentReminderScheduler } from './services/appointment-reminder.scheduler';
import { AppointmentService } from './services/appointment.service';

@Module({
  imports: [ClinicScheduleModule, NotificationModule],
  controllers: [
    AppointmentSharedController,
    AppointmentAppController,
    AppointmentDashboardController,
  ],
  providers: [
    AppointmentService,
    AppointmentNotificationService,
    AppointmentQueryService,
    AppointmentAvailabilityService,
    AppointmentAdapter,
    AppointmentNoShowScheduler,
    AppointmentReminderScheduler,
  ],
  exports: [
    AppointmentService,
    AppointmentQueryService,
    AppointmentAvailabilityService,
  ],
})
export class AppointmentsModule {}
