import { ApiProperty } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateAppAppointmentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  type!: AppointmentType;

  @ApiProperty({
    description: 'UTC ISO datetime for the chosen slot start',
    example: '2026-08-20T06:00:00.000Z',
  })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ required: false, nullable: true })
  @ValidateIf(
    (o: CreateAppAppointmentDto) => o.type === AppointmentType.FOLLOW_UP,
  )
  @Type(() => Number)
  @IsInt()
  treatmentSessionId?: number | null;

  @ApiProperty({ required: false, nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reasonForVisit?: string | null;

  @ApiProperty({ required: false, nullable: true, maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  chatbotSummary?: string | null;
}
