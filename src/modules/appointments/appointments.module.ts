import { Module } from '@nestjs/common';
import { ClinicScheduleModule } from 'src/modules/clinic-schedule/clinic-schedule.module';
import { AppointmentAdapter } from './adapter/appointment.adapter';
import { AppointmentAppController } from './controllers/appointment-app.controller';
import { AppointmentDashboardController } from './controllers/appointment-dashboard.controller';
import { AppointmentSharedController } from './controllers/appointment-shared.controller';
import { AppointmentAvailabilityService } from './services/appointment-availability.service';
import { AppointmentService } from './services/appointment.service';

@Module({
  imports: [ClinicScheduleModule],
  controllers: [
    AppointmentSharedController,
    AppointmentAppController,
    AppointmentDashboardController,
  ],
  providers: [
    AppointmentService,
    AppointmentAvailabilityService,
    AppointmentAdapter,
  ],
  exports: [AppointmentService, AppointmentAvailabilityService],
})
export class AppointmentsModule {}
