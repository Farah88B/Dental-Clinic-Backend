import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class AppCheckInDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @ApiProperty({
    description: 'Payload encoded in the clinic wall QR code',
  })
  @IsString()
  @MinLength(8)
  clinicCheckInCode!: string;

  @ApiProperty({ example: 33.5138 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 36.2765 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({
    description:
      'Optional when the patient has exactly one CONFIRMED appointment today',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  appointmentId?: number;
}

export class ClinicCheckInCodeResponseDto {
  @ApiProperty({
    description: 'Print this string as the clinic QR payload',
  })
  code!: string;

  constructor(partial: Partial<ClinicCheckInCodeResponseDto>) {
    Object.assign(this, partial);
  }
}
