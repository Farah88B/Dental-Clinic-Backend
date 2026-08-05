import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalAttachmentType, TreatmentSessionStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

export const PATIENT_SESSION_LIST_STATUSES = [
  TreatmentSessionStatus.COMPLETED,
  TreatmentSessionStatus.PENDING,
  TreatmentSessionStatus.BOOKED,
] as const;

export type PatientSessionListStatus =
  (typeof PATIENT_SESSION_LIST_STATUSES)[number];

export const PATIENT_MEDICAL_ARCHIVE_TYPES = [
  MedicalAttachmentType.XRAY,
  MedicalAttachmentType.REPORT,
] as const;

export type PatientMedicalArchiveType =
  (typeof PATIENT_MEDICAL_ARCHIVE_TYPES)[number];

export enum PatientSessionFileType {
  XRAY = 'XRAY',
  REPORT = 'REPORT',
  PHOTO = 'PHOTO',
  PRESCRIPTION = 'PRESCRIPTION',
}

export class ListPatientTreatmentSessionsQueryDto {
  @ApiProperty({
    enum: PATIENT_SESSION_LIST_STATUSES,
    description: 'Filter sessions by status',
  })
  @IsIn(PATIENT_SESSION_LIST_STATUSES)
  status!: PatientSessionListStatus;
}

export class ListPatientMedicalArchiveQueryDto {
  @ApiPropertyOptional({
    enum: PATIENT_MEDICAL_ARCHIVE_TYPES,
    description: 'Filter archive items by attachment type',
  })
  @IsOptional()
  @IsIn(PATIENT_MEDICAL_ARCHIVE_TYPES)
  type?: PatientMedicalArchiveType;
}

export class ListPatientPlanSessionFilesQueryDto {
  @ApiPropertyOptional({
    enum: PatientSessionFileType,
    description:
      'Filter files. PRESCRIPTION returns prescription text; other values filter attachments.',
  })
  @IsOptional()
  @IsEnum(PatientSessionFileType)
  type?: PatientSessionFileType;
}
