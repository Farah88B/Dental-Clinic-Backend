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
      'Confirm despite appointment conflicts — TODO(Appointments): BR-50',
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
