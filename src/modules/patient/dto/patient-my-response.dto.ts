import { ApiProperty } from '@nestjs/swagger';
import { Gender, PatientStatus } from '@prisma/client';

export class ProfileImageDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  url!: string;
}

export class PatientMyResponseDto {
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

  constructor(partial: Partial<PatientMyResponseDto>) {
    Object.assign(this, partial);
  }
}
