import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TIME_HH_MM_PATTERN } from '../helpers/schedule-time.helper';
import { ScheduleBreakDto } from './schedule-break.dto';

export class CreateScheduleExceptionDto {
  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsBoolean()
  isWorkingDay!: boolean;

  @ApiProperty({ required: false, nullable: true, example: '10:00' })
  @ValidateIf((o: CreateScheduleExceptionDto) => o.isWorkingDay === true)
  @Matches(TIME_HH_MM_PATTERN)
  startTime?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '14:00' })
  @ValidateIf((o: CreateScheduleExceptionDto) => o.isWorkingDay === true)
  @Matches(TIME_HH_MM_PATTERN)
  endTime?: string | null;

  @ApiProperty({ type: [ScheduleBreakDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleBreakDto)
  @ArrayMaxSize(20)
  breaks?: ScheduleBreakDto[];

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'Confirm despite appointment conflicts — TODO(Appointments): BR-50',
  })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
