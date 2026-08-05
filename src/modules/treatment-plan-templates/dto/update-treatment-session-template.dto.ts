import { PartialType } from '@nestjs/swagger';
import { CreateTreatmentSessionTemplateDto } from './create-treatment-session-template.dto';

export class UpdateTreatmentSessionTemplateDto extends PartialType(
  CreateTreatmentSessionTemplateDto,
) {}
