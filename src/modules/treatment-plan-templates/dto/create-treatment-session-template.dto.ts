import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTreatmentSessionTemplateDto {
  @ApiProperty({ example: 'جلسة تنظيف القناة' })
  @IsString()
  titleAr!: string;

  @ApiProperty({ example: 'Canal Cleaning Session' })
  @IsString()
  titleEn!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  sessionOrder!: number;

  @ApiProperty({ required: false, example: 45, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiProperty({
    required: false,
    example: 7,
    minimum: 0,
    description:
      'Abstract day-count only (Epic A). Epic B converts this to an actual earliestBookingDate.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDaysBeforeBooking?: number;

  @ApiProperty({ example: 50000, minimum: 0 })
  @IsInt()
  @Min(0)
  estimatedCost!: number;
}
