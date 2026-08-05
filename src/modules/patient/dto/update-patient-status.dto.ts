import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const SETTABLE_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
type PatientStatus = (typeof SETTABLE_STATUSES)[number];

export class UpdatePatientStatusDto {
  @ApiProperty({ enum: SETTABLE_STATUSES })
  @IsNotEmpty()
  @IsIn(SETTABLE_STATUSES)
  status!: PatientStatus;
}
