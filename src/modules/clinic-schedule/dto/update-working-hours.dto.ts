import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { WorkingHoursDayDto } from './working-hours-day.dto';

export class UpdateWorkingHoursDto {
  @ApiProperty({
    required: false,
    default: false,
    description:
      'Set true to apply the change even when future appointments fall outside the new windows. Appointments are not cancelled.',
  })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;

  @ApiProperty({ type: [WorkingHoursDayDto] })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDayDto)
  days!: WorkingHoursDayDto[];
}
