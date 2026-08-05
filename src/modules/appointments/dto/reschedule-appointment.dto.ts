import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({
    description: 'UTC ISO datetime for the new slot start',
    example: '2026-08-21T06:00:00.000Z',
  })
  @IsDateString()
  scheduledAt!: string;
}
