import { Module } from '@nestjs/common';
import { PatientAdapter } from './adapter/patient.adapter';
import { PatientFormSchemaAdapter } from './adapter/patient-form-schema.adapter';
import { PatientAppController } from './controllers/patient-app.controller';
import { PatientDashboardController } from './controllers/patient-dashboard.controller';
import { PatientSharedController } from './controllers/patient-shared.controller';
import { MedicalRecordNumberService } from './services/medical-record-number.service';
import { PatientFormValidationService } from './services/patient-form-validation.service';
import { PatientService } from './services/patient.service';

@Module({
  controllers: [
    PatientAppController,
    PatientDashboardController,
    PatientSharedController,
  ],
  providers: [
    PatientService,
    PatientAdapter,
    PatientFormSchemaAdapter,
    PatientFormValidationService,
    MedicalRecordNumberService,
  ],
  exports: [PatientService],
})
export class PatientModule {}
