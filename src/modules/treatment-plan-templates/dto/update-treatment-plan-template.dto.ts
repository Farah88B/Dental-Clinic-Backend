import { OmitType, PartialType, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateTreatmentPlanTemplateDto } from './create-treatment-plan-template.dto';

export class UpdateTreatmentPlanTemplateDto extends PartialType(
  OmitType(CreateTreatmentPlanTemplateDto, ['sessions'] as const),
) {
  @ApiProperty({ required: false, example: 150000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedCost?: number;
}
