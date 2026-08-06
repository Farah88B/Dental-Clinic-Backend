import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  @ApiProperty({
    required: false,
    description: 'How far ahead patients may book (days from today, clinic timezone)',
  })
  @IsOptional() @IsInt() @Min(1)
  maxBookingHorizonDays?: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Clinic latitude for QR check-in geofence (WGS84)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Clinic longitude for QR check-in geofence (WGS84)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiProperty({
    required: false,
    description: 'Allowed distance from clinic pin for app QR check-in (meters)',
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  checkInRadiusMeters?: number;
}
