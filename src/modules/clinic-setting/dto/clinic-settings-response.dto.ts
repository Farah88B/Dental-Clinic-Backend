import { ApiProperty } from '@nestjs/swagger';

export class ClinicSettingsResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() bufferTimeMinutes!: number;
  @ApiProperty() cancelRescheduleWindowHours!: number;
  @ApiProperty() defaultConsultationDurationMinutes!: number;
  @ApiProperty() reminderLeadTimeHours!: number;
  @ApiProperty() ratingValidityHours!: number;
  @ApiProperty() autoConfirmationEnabled!: boolean;
  @ApiProperty() onlineBookingEnabled!: boolean;
  @ApiProperty() maxBookingHorizonDays!: number;
  @ApiProperty({ required: false, nullable: true, type: Number })
  latitude!: number | null;
  @ApiProperty({ required: false, nullable: true, type: Number })
  longitude!: number | null;
  @ApiProperty() checkInRadiusMeters!: number;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<ClinicSettingsResponseDto>) {
    Object.assign(this, partial);
  }
}