import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListScheduleExceptionsQueryDto {
  @ApiProperty({ required: false, example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false, example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CalendarQueryDto {
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

export class DeleteScheduleExceptionQueryDto {
  @ApiProperty({
    required: false,
    default: false,
    description:
      'Confirm despite appointment conflicts — TODO(Appointments): BR-50',
  })
  @IsOptional()
  @Type(() => Boolean)
  confirmed?: boolean;
}
