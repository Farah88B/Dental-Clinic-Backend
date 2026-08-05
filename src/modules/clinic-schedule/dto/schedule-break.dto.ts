import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { TIME_HH_MM_PATTERN } from '../helpers/schedule-time.helper';

export class ScheduleBreakDto {
  @ApiProperty({ example: '13:00', description: 'Break start as HH:mm' })
  @Matches(TIME_HH_MM_PATTERN, {
    message: 'breaks.startTime must be HH:mm (00:00–23:59)',
  })
  startTime!: string;

  @ApiProperty({ example: '14:00', description: 'Break end as HH:mm' })
  @Matches(TIME_HH_MM_PATTERN, {
    message: 'breaks.endTime must be HH:mm (00:00–23:59)',
  })
  endTime!: string;
}
