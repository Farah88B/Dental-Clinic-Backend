import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreatePatientFormValueDto {
  @ApiProperty({ example: 'chronic_diseases' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: ['diabetes'] })
  @IsDefined()
  value!: unknown;
}

export class CreatePatientDto {
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
