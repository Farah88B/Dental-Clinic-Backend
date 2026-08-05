import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsOptional,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TIME_HH_MM_PATTERN } from '../helpers/schedule-time.helper';
import { ScheduleBreakDto } from './schedule-break.dto';

export class WorkingHoursDayDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty()
  @IsBoolean()
  isWorkingDay!: boolean;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '09:00',
    description: 'Start time HH:mm when isWorkingDay is true',
  })
  @ValidateIf((o: WorkingHoursDayDto) => o.isWorkingDay === true)
  @Matches(TIME_HH_MM_PATTERN)
  startTime?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '17:00',
    description: 'End time HH:mm when isWorkingDay is true',
  })
  @ValidateIf((o: WorkingHoursDayDto) => o.isWorkingDay === true)
  @Matches(TIME_HH_MM_PATTERN)
  endTime?: string | null;

  @ApiProperty({ type: [ScheduleBreakDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleBreakDto)
  @ArrayMaxSize(20)
  breaks?: ScheduleBreakDto[];
}
