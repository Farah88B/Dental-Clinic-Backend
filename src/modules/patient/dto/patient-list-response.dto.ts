import { ApiProperty } from '@nestjs/swagger';
import { Gender, PatientStatus } from '@prisma/client';
import { ProfileImageDto } from './patient-my-response.dto';

export class PatientListResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  medicalRecordNumber!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty()
  birthDate!: Date;

  @ApiProperty({ enum: Gender })
  gender!: Gender;

  @ApiProperty({ enum: PatientStatus })
  status!: PatientStatus;

  @ApiProperty({ nullable: true })
  lastVisitAt!: Date | null;

  @ApiProperty({ type: ProfileImageDto, nullable: true })
  profileImage!: ProfileImageDto | null;

  @ApiProperty({ nullable: true })
  accountId!: number | null;

  constructor(partial: Partial<PatientListResponseDto>) {
    Object.assign(this, partial);
  }
}
