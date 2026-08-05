import { ApiProperty } from '@nestjs/swagger';
import {
  AccountStatus,
  Gender,
  PatientFormFieldType,
  PatientStatus,
} from '@prisma/client';
import { ProfileImageDto } from './patient-my-response.dto';

export class PatientFormDetailValueDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: PatientFormFieldType })
  type!: PatientFormFieldType;

  @ApiProperty()
  value!: unknown;
}

export class AccountSummaryDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ enum: AccountStatus })
  status!: AccountStatus;
}

export class PatientDetailResponseDto {
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

  @ApiProperty({ type: ProfileImageDto, nullable: true })
  profileImage!: ProfileImageDto | null;

  @ApiProperty({ enum: PatientStatus })
  status!: PatientStatus;

  @ApiProperty({ nullable: true })
  lastVisitAt!: Date | null;

  @ApiProperty({ type: AccountSummaryDto, nullable: true })
  account!: AccountSummaryDto | null;

  @ApiProperty({ type: [PatientFormDetailValueDto] })
  formValues!: PatientFormDetailValueDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(partial: Partial<PatientDetailResponseDto>) {
    Object.assign(this, partial);
  }
}
