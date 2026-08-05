import { IsArray, IsOptional, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TREATMENT_CONSTANTS } from 'src/common/constants/treatment.constants';

export class UpdateEncounterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiProperty({
    required: false,
    description: `Exactly ${TREATMENT_CONSTANTS.TEETH_COUNT} entries`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(TREATMENT_CONSTANTS.TEETH_COUNT)
  @ArrayMaxSize(TREATMENT_CONSTANTS.TEETH_COUNT)
  teeth?: unknown[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prescription?: string;
}
