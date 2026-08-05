import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TreatmentPlanStatus } from '@prisma/client';

export class UpdateTreatmentPlanDto {
  @ApiProperty({
    enum: [TreatmentPlanStatus.CANCELLED],
    required: false,
    description: 'Only CANCELLED is allowed',
  })
  @IsOptional()
  @IsEnum(TreatmentPlanStatus)
  status?: TreatmentPlanStatus;
}
