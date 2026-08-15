import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

export enum AppointmentListScope {
  UPCOMING = 'UPCOMING',
  PAST = 'PAST',
}

export class UpcomingAppointmentQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  patientId!: number;
}

export class PatientAppointmentListQueryDto extends PaginationDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @ApiProperty({ enum: AppointmentListScope })
  @IsEnum(AppointmentListScope)
  scope!: AppointmentListScope;
}

export class AppointmentListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by patient full name or medical record number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isWaiting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledTo?: Date;

  @ApiPropertyOptional({
    enum: ['scheduledAt', 'createdAt', 'status'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'scheduledAt' | 'createdAt' | 'status';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc';
}

export class AppointmentPatientSummaryDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  medicalRecordNumber!: string;

  constructor(partial: Partial<AppointmentPatientSummaryDto>) {
    Object.assign(this, partial);
  }
}

export class AppointmentListItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  patientId!: number;

  @ApiProperty({ enum: AppointmentType })
  type!: AppointmentType;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty()
  scheduledAt!: Date;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  isWaiting!: boolean;

  @ApiPropertyOptional({ nullable: true })
  reasonForVisit!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Localized treatment session title when the appointment is linked to a session',
  })
  treatmentSessionName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Localized treatment plan name when the appointment is linked to a session',
  })
  treatmentPlanName!: string | null;

  @ApiPropertyOptional({ type: AppointmentPatientSummaryDto })
  patient?: AppointmentPatientSummaryDto;

  constructor(partial: Partial<AppointmentListItemDto>) {
    Object.assign(this, partial);
  }
}

export class AppointmentStatusCountsDto {
  @ApiProperty()
  PENDING_CONFIRMATION!: number;

  @ApiProperty()
  CONFIRMED!: number;

  @ApiProperty()
  CHECKED_IN!: number;

  @ApiProperty()
  IN_TREATMENT!: number;

  @ApiProperty()
  COMPLETED!: number;

  @ApiProperty()
  CANCELLED!: number;

  @ApiProperty()
  NO_SHOW!: number;

  constructor(partial: Partial<AppointmentStatusCountsDto>) {
    Object.assign(this, partial);
  }
}

export class AppointmentListCountsDto {
  @ApiProperty({ type: AppointmentStatusCountsDto })
  byStatus!: AppointmentStatusCountsDto;

  @ApiProperty()
  waiting!: number;

  constructor(partial: Partial<AppointmentListCountsDto>) {
    Object.assign(this, partial);
  }
}

export class AppointmentStaffListResponseDto {
  @ApiProperty({ type: [AppointmentListItemDto] })
  items!: AppointmentListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: AppointmentListCountsDto })
  counts!: AppointmentListCountsDto;

  constructor(partial: Partial<AppointmentStaffListResponseDto>) {
    Object.assign(this, partial);
  }
}
