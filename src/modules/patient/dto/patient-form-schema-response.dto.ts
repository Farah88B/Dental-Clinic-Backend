import { ApiProperty } from '@nestjs/swagger';
import { PatientFormFieldType } from '@prisma/client';

export class PatientFormSchemaOptionResponseDto {
  @ApiProperty()
  value!: string;

  @ApiProperty()
  label!: string;
}

export class PatientFormSchemaResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: PatientFormFieldType })
  type!: PatientFormFieldType;

  @ApiProperty()
  required!: boolean;

  @ApiProperty({ required: false, nullable: true, type: Object })
  validation!: Record<string, unknown> | null;

  @ApiProperty({ type: [PatientFormSchemaOptionResponseDto], required: false, nullable: true })
  options!: PatientFormSchemaOptionResponseDto[] | null;

  @ApiProperty()
  displayOrder!: number;

  constructor(partial: Partial<PatientFormSchemaResponseDto>) {
    Object.assign(this, partial);
  }
}
