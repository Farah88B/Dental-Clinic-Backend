import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, PatientStatus } from '@prisma/client';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

export class PatientListQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PatientStatus })
  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastVisitFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastVisitTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: 'fullName' | 'createdAt' | 'lastVisitAt' | 'medicalRecordNumber';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc';
}
