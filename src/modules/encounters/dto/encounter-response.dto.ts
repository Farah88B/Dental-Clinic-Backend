import { ApiProperty } from '@nestjs/swagger';
import { EncounterStatus, MedicalAttachmentType } from '@prisma/client';

export class MedicalAttachmentResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() encounterId!: number;
  @ApiProperty() mediaFileId!: number;
  @ApiProperty({ enum: MedicalAttachmentType }) type!: MedicalAttachmentType;
  @ApiProperty({ required: false, nullable: true }) title!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<MedicalAttachmentResponseDto>) {
    Object.assign(this, partial);
  }
}

export class EncounterResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() treatmentSessionId!: number;
  @ApiProperty({ required: false, nullable: true }) appointmentId!: number | null;
  @ApiProperty({ enum: EncounterStatus }) status!: EncounterStatus;
  @ApiProperty({ required: false, nullable: true }) diagnosis!: string | null;
  @ApiProperty({ required: false, nullable: true }) clinicalNotes!: string | null;
  @ApiProperty({ description: 'Fixed-length array of 48 tooth entries' }) teeth!: unknown[];
  @ApiProperty({ required: false, nullable: true }) prescription!: string | null;
  @ApiProperty({ type: [MedicalAttachmentResponseDto] }) attachments!: MedicalAttachmentResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<EncounterResponseDto>) {
    Object.assign(this, partial);
  }
}
