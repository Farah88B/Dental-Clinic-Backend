import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreatePatientFormValueDto } from './create-patient.dto';

export class UpdatePatientDto {
  @ApiProperty({ example: 'Ahmad Al-Hassan' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: '1990-01-31', type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  birthDate!: Date;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ type: [CreatePatientFormValueDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePatientFormValueDto)
  formValues?: CreatePatientFormValueDto[];
}
