import { ApiProperty } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class AvailableDaysQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  type!: AppointmentType;

  @ApiProperty({ required: false })
  @ValidateIf((o: AvailableDaysQueryDto) => o.type === AppointmentType.FOLLOW_UP)
  @Type(() => Number)
  @IsInt()
  treatmentSessionId?: number;

  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;
}

export class AvailableSlotsQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  type!: AppointmentType;

  @ApiProperty({ required: false })
  @ValidateIf(
    (o: AvailableSlotsQueryDto) => o.type === AppointmentType.FOLLOW_UP,
  )
  @Type(() => Number)
  @IsInt()
  treatmentSessionId?: number;

  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  date!: string;
}
