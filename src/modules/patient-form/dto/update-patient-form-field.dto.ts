import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePatientFormFieldDto } from './create-patient-form-field.dto';

// `key` is the stable programmatic identifier and should remain immutable after creation.
export class UpdatePatientFormFieldDto extends PartialType(
  OmitType(CreatePatientFormFieldDto, ['key'] as const),
) {}