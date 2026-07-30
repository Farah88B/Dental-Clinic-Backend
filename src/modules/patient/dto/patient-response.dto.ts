import { ApiProperty } from '@nestjs/swagger';
import { Gender, PatientStatus } from '@prisma/client';

export class PatientFormValueResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  value!: unknown;
}

export class PatientResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  medicalRecordNumber!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  birthDate!: Date;

  @ApiProperty({ enum: Gender })
  gender!: Gender;

  @ApiProperty({ enum: PatientStatus })
  status!: PatientStatus;

  @ApiProperty({ type: [PatientFormValueResponseDto] })
  formValues!: PatientFormValueResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(partial: Partial<PatientResponseDto>) {
    Object.assign(this, partial);
  }
}
