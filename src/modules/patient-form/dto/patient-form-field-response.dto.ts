import { ApiProperty } from '@nestjs/swagger';
import { PatientFormFieldType } from '@prisma/client';

export class PatientFormFieldResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  labelAr!: string;

  @ApiProperty()
  labelEn!: string;

  @ApiProperty({ enum: PatientFormFieldType })
  type!: PatientFormFieldType;

  @ApiProperty()
  required!: boolean;

  @ApiProperty({ required: false, nullable: true, type: Object })
  validation!: Record<string, unknown> | null;

  @ApiProperty({ required: false, nullable: true, isArray: true, type: Object })
  options!: unknown[] | null;

  @ApiProperty()
  displayOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(partial: Partial<PatientFormFieldResponseDto>) {
    Object.assign(this, partial);
  }
}