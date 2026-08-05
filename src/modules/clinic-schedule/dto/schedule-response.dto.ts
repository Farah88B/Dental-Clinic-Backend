import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import { ScheduleBreakDto } from './schedule-break.dto';

export class WorkingHoursResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: DayOfWeek })
  dayOfWeek!: DayOfWeek;

  @ApiProperty()
  isWorkingDay!: boolean;

  @ApiProperty({ nullable: true, example: '09:00' })
  startTime!: string | null;

  @ApiProperty({ nullable: true, example: '17:00' })
  endTime!: string | null;

  @ApiProperty({ type: [ScheduleBreakDto] })
  breaks!: ScheduleBreakDto[];

  @ApiProperty()
  updatedAt!: Date;

  constructor(partial: Partial<WorkingHoursResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ScheduleExceptionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: '2026-08-20' })
  date!: string;

  @ApiProperty()
  isWorkingDay!: boolean;

  @ApiProperty({ nullable: true, example: '10:00' })
  startTime!: string | null;

  @ApiProperty({ nullable: true, example: '14:00' })
  endTime!: string | null;

  @ApiProperty({ type: [ScheduleBreakDto] })
  breaks!: ScheduleBreakDto[];

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(partial: Partial<ScheduleExceptionResponseDto>) {
    Object.assign(this, partial);
  }
}

export class CalendarDayResponseDto {
  @ApiProperty({ example: '2026-08-01' })
  date!: string;

  @ApiProperty({ description: 'Whether the clinic is open that day' })
  isWorkingDay!: boolean;

  @ApiProperty({
    description:
      'Whether a patient may book that day (working day + horizon + online booking)',
  })
  isBookable!: boolean;

  constructor(partial: Partial<CalendarDayResponseDto>) {
    Object.assign(this, partial);
  }
}
