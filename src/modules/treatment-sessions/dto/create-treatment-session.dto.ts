import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTreatmentSessionDto {
  @ApiProperty({ example: 'جلسة تنظيف' })
  @IsString()
  titleAr!: string;

  @ApiProperty({ example: 'Cleaning Session' })
  @IsString()
  titleEn!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  sessionOrder!: number;

  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDaysBeforeBooking?: number;

  @ApiProperty({ example: 50000, minimum: 0 })
  @IsInt()
  @Min(0)
  estimatedCost!: number;
}
