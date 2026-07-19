import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClinicSettingsDto {
  @ApiProperty({ required: false, description: 'Buffer time between appointments (minutes)' })
  @IsOptional() @IsInt() @Min(0)
  bufferTimeMinutes?: number;

  @ApiProperty({ required: false, description: 'Minimum notice before cancel/reschedule is allowed (hours)' })
  @IsOptional() @IsInt() @Min(0)
  cancelRescheduleWindowHours?: number;

  @ApiProperty({ required: false, description: 'Default consultation session length (minutes)' })
  @IsOptional() @IsInt() @Min(1)
  defaultConsultationDurationMinutes?: number;

  @ApiProperty({ required: false, description: 'How long before the appointment to send a reminder (hours)' })
  @IsOptional() @IsInt() @Min(0)
  reminderLeadTimeHours?: number;

  @ApiProperty({ required: false, description: 'How long a completed session stays rateable (hours)' })
  @IsOptional() @IsInt() @Min(0)
  ratingValidityHours?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  autoConfirmationEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  onlineBookingEnabled?: boolean;
}