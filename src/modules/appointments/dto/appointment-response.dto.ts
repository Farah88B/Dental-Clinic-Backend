import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { AppointmentPatientSummaryDto } from './appointment-list.dto';

export class AppointmentResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  patientId!: number;

  @ApiProperty({ required: false, nullable: true })
  createdById!: number | null;

  @ApiProperty({ required: false, nullable: true })
  treatmentSessionId!: number | null;

  @ApiProperty({ required: false, nullable: true })
  confirmedById!: number | null;

  @ApiProperty({ required: false, nullable: true })
  cancelledById!: number | null;

  @ApiProperty({ required: false, nullable: true })
  rescheduledById!: number | null;

  @ApiProperty({ required: false, nullable: true })
  checkedInById!: number | null;

  @ApiProperty({ enum: AppointmentType })
  type!: AppointmentType;

  @ApiProperty()
  scheduledAt!: Date;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty()
  isWaiting!: boolean;

  @ApiProperty({ required: false, nullable: true })
  reasonForVisit!: string | null;

  @ApiProperty({ required: false, nullable: true })
  chatbotSummary!: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty({ required: false, nullable: true })
  confirmedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  cancellationReason!: string | null;

  @ApiProperty({ required: false, nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  rescheduledAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  checkedInAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ required: false, type: () => AppointmentPatientSummaryDto })
  patient?: AppointmentPatientSummaryDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(partial: Partial<AppointmentResponseDto>) {
    Object.assign(this, partial);
  }
}

export class AvailableDayResponseDto {
  @ApiProperty({ example: '2026-08-20' })
  date!: string;

  @ApiProperty()
  isWorkingDay!: boolean;

  @ApiProperty()
  hasAvailableSlots!: boolean;

  constructor(partial: Partial<AvailableDayResponseDto>) {
    Object.assign(this, partial);
  }
}

export class AvailableSlotResponseDto {
  @ApiProperty({ example: '09:00' })
  startTime!: string;

  constructor(partial: Partial<AvailableSlotResponseDto>) {
    Object.assign(this, partial);
  }
}
