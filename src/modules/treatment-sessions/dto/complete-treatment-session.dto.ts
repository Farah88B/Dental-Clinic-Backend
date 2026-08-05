import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TREATMENT_CONSTANTS } from 'src/common/constants/treatment.constants';

export class CompleteTreatmentSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiProperty({
    required: false,
    description: `Exactly ${TREATMENT_CONSTANTS.TEETH_COUNT} entries`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(TREATMENT_CONSTANTS.TEETH_COUNT)
  @ArrayMaxSize(TREATMENT_CONSTANTS.TEETH_COUNT)
  teeth?: unknown[];

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  actualCost?: number;

  @ApiProperty({
    required: false,
    description: 'Optional updates applied to the next PENDING session',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  nextDurationMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  nextEstimatedCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  nextMinDaysBeforeBooking?: number;
}
