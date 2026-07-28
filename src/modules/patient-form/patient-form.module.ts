import { Module } from '@nestjs/common';
import { PatientFormController } from './controllers/patient-form.controller';
import { PatientFormService } from './services/patient-form.service';
import { PatientFormFieldAdapter } from './adapter/patient-form-field.adapter';

@Module({
  controllers: [PatientFormController],
  providers: [PatientFormService, PatientFormFieldAdapter],
  exports: [PatientFormService],
})
export class PatientFormModule {}