import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { CreatePatientDto } from './create-patient.dto';

export class CreateDashboardPatientDto extends CreatePatientDto {
  @ApiPropertyOptional({ example: 12, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  accountId?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowDuplicateCreation?: boolean;
}
