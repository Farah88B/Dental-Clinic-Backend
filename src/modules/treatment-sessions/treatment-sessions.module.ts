import { Module, forwardRef } from '@nestjs/common';
import { TreatmentSessionsController } from './controllers/treatment-sessions.controller';
import { PatientTreatmentAppController } from './controllers/patient-treatment-app.controller';
import { PatientTreatmentStaffController } from './controllers/patient-treatment-staff.controller';
import { TreatmentSessionsService } from './services/treatment-sessions.service';
import { PatientTreatmentService } from './services/patient-treatment.service';
import { TreatmentSessionAdapter } from './adapter/treatment-session.adapter';
import { TreatmentPlansModule } from 'src/modules/treatment-plans/treatment-plans.module';
import { EncountersModule } from 'src/modules/encounters/encounters.module';

@Module({
  imports: [forwardRef(() => TreatmentPlansModule), EncountersModule],
  controllers: [
    TreatmentSessionsController,
    PatientTreatmentAppController,
    PatientTreatmentStaffController,
  ],
  providers: [
    TreatmentSessionsService,
    TreatmentSessionAdapter,
    PatientTreatmentService,
  ],
  exports: [
    TreatmentSessionsService,
    TreatmentSessionAdapter,
    PatientTreatmentService,
  ],
})
export class TreatmentSessionsModule {}
