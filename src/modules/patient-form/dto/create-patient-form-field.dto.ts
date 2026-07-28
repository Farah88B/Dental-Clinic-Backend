import { ApiProperty } from '@nestjs/swagger';
import { PatientFormFieldType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Shape of a single entry inside `options`.
 * Must stay in sync with the `FieldOption` interface used in
 * PatientFormService (normalizeNewOptions / mergeOptions).
 */
export class PatientFormFieldOptionDto {
  @ApiProperty({ example: 'diabetes', description: 'Stable machine value, never reused after deletion' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'value must be a lowercase snake_case identifier' })
  @MaxLength(100)
  value!: string;

  @ApiProperty({ example: 'سكري' })
  @IsString()
  @MaxLength(255)
  labelAr!: string;

  @ApiProperty({ example: 'Diabetes' })
  @IsString()
  @MaxLength(255)
  labelEn!: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePatientFormFieldDto {
  @ApiProperty({ example: 'medical_history', description: 'Unique machine key in snake_case' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'key must be a lowercase snake_case identifier' })
  @MinLength(2)
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: 'التاريخ المرضي' })
  @IsString()
  @MaxLength(255)
  labelAr!: string;

  @ApiProperty({ example: 'Medical History' })
  @IsString()
  @MaxLength(255)
  labelEn!: string;

  @ApiProperty({ enum: PatientFormFieldType })
  @IsEnum(PatientFormFieldType)
  type!: PatientFormFieldType;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  // Kept intentionally loose: the shape of `validation` depends on `type`
  // (e.g. minLength/maxLength for TEXT, min/max for NUMBER). Enforcing a
  // strict nested DTO here would need a discriminated-union validator keyed
  // off `type`, which is more complexity than this currently buys us.
  @ApiProperty({ required: false, nullable: true, type: Object })
  @IsOptional()
  @IsObject()
  validation?: Record<string, unknown>;

  @ApiProperty({ required: false, type: [PatientFormFieldOptionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'options must contain at least one item when provided' })
  @ArrayUnique((option: PatientFormFieldOptionDto) => option.value, {
    message: 'options must not contain duplicate values',
  })
  @ValidateNested({ each: true })
  @Type(() => PatientFormFieldOptionDto)
  options?: PatientFormFieldOptionDto[];

  @ApiProperty({
    required: false,
    example: 1,
    description: 'If omitted, the field is appended to the end of the list',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}