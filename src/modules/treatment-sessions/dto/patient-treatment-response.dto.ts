import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MediaFileCategory,
  MedicalAttachmentType,
  TreatmentPlanStatus,
  TreatmentSessionStatus,
} from '@prisma/client';

export class PatientTreatmentMediaFileResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() path!: string;
  @ApiProperty() originalName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty({ enum: MediaFileCategory }) category!: MediaFileCategory;
  @ApiProperty() publicUrl!: string;

  constructor(partial: Partial<PatientTreatmentMediaFileResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PatientMedicalAttachmentResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ enum: MedicalAttachmentType }) type!: MedicalAttachmentType;
  @ApiProperty({ required: false, nullable: true }) title!: string | null;
  @ApiProperty({ type: PatientTreatmentMediaFileResponseDto })
  mediaFile!: PatientTreatmentMediaFileResponseDto;
  @ApiProperty() createdAt!: Date;

  constructor(partial: Partial<PatientMedicalAttachmentResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PatientTreatmentEncounterResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ required: false, nullable: true })
  prescription!: string | null;
  @ApiProperty({ type: [PatientMedicalAttachmentResponseDto] })
  attachments!: PatientMedicalAttachmentResponseDto[];
  @ApiProperty({ required: false, nullable: true })
  diagnosis!: string | null;
  @ApiProperty({ required: false, nullable: true })
  clinicalNotes!: string | null;

  constructor(partial: Partial<PatientTreatmentEncounterResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PatientSessionPendingRatingResponseDto {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ format: 'date-time' }) canRateUntil!: string;

  constructor(partial: Partial<PatientSessionPendingRatingResponseDto>) {
    Object.assign(this, partial);
  }
}

/** Session fields shared by list + plan-detail (no actualCost). */
export class PatientTreatmentSessionBaseResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() sessionOrder!: number;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: TreatmentSessionStatus })
  status!: TreatmentSessionStatus;
  @ApiProperty({
    description:
      'Computed: PENDING, next after last completed, no active linked appointment',
  })
  canBook!: boolean;
  @ApiProperty({
    description:
      'Computed: BOOKED with linked appointment in CONFIRMED | CHECKED_IN',
  })
  canTreat!: boolean;
  @ApiProperty({ required: false, nullable: true })
  durationMinutes!: number | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Only set for PENDING or BOOKED; otherwise null',
  })
  estimatedCost!: string | null;
  @ApiProperty({ required: false, nullable: true })
  availableForBookingAt!: Date | null;
  @ApiProperty({ required: false, nullable: true })
  completedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true }) rating!: number | null;
  @ApiProperty({
    required: false,
    nullable: true,
    type: PatientSessionPendingRatingResponseDto,
  })
  pendingRating!: PatientSessionPendingRatingResponseDto | null;
  @ApiProperty({
    required: false,
    nullable: true,
    type: PatientTreatmentEncounterResponseDto,
  })
  encounter!: PatientTreatmentEncounterResponseDto | null;

  constructor(partial: Partial<PatientTreatmentSessionBaseResponseDto>) {
    Object.assign(this, partial);
  }
}

/** Cross-plan session list item (includes plan id + template names). */
export class PatientTreatmentSessionResponseDto extends PatientTreatmentSessionBaseResponseDto {
  @ApiProperty() treatmentPlanId!: number;
  @ApiProperty({ required: false, nullable: true })
  planName!: string | null;

  constructor(partial: Partial<PatientTreatmentSessionResponseDto>) {
    super(partial);
    Object.assign(this, partial);
  }
}

/** Session nested under a plan detail (omits treatmentPlanId). */
export class PatientPlanSessionResponseDto extends PatientTreatmentSessionBaseResponseDto {
  constructor(partial: Partial<PatientPlanSessionResponseDto>) {
    super(partial);
  }
}

/** Plan list summary — no nested sessions. */
export class PatientTreatmentPlanResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() patientId!: number;
  @ApiProperty({ enum: TreatmentPlanStatus }) status!: TreatmentPlanStatus;
  @ApiProperty() estimatedCost!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({
    description: 'Non-cancelled session count',
  })
  sessionCount!: number;
  @ApiProperty({
    description: 'Completed / non-cancelled sessions * 100, rounded',
  })
  progressPercent!: number;
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Localized plan name (from linked template when present)',
  })
  name!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<PatientTreatmentPlanResponseDto>) {
    Object.assign(this, partial);
  }
}

/** Plan detail with nested sessions. */
export class PatientTreatmentPlanDetailResponseDto extends PatientTreatmentPlanResponseDto {
  @ApiProperty({ type: [PatientPlanSessionResponseDto] })
  sessions!: PatientPlanSessionResponseDto[];

  constructor(partial: Partial<PatientTreatmentPlanDetailResponseDto>) {
    super(partial);
    Object.assign(this, partial);
  }
}

export class PatientMedicalArchivePlanResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Localized plan name (from linked template when present)',
  })
  name!: string | null;

  constructor(partial: Partial<PatientMedicalArchivePlanResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PatientMedicalArchiveSessionResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() sessionOrder!: number;
  @ApiProperty() title!: string;
  @ApiProperty({ type: PatientMedicalArchivePlanResponseDto })
  plan!: PatientMedicalArchivePlanResponseDto;

  constructor(partial: Partial<PatientMedicalArchiveSessionResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PatientMedicalArchiveItemResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ enum: MedicalAttachmentType }) type!: MedicalAttachmentType;
  @ApiProperty({ required: false, nullable: true }) title!: string | null;
  @ApiProperty({ type: PatientMedicalArchiveSessionResponseDto })
  session!: PatientMedicalArchiveSessionResponseDto;
  @ApiProperty({ type: PatientTreatmentMediaFileResponseDto })
  mediaFile!: PatientTreatmentMediaFileResponseDto;
  @ApiProperty() createdAt!: Date;

  constructor(partial: Partial<PatientMedicalArchiveItemResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PatientPlanSessionFilesResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() sessionOrder!: number;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Present when type is PRESCRIPTION or omitted',
  })
  prescription!: string | null;
  @ApiProperty({ type: [PatientMedicalAttachmentResponseDto] })
  attachments!: PatientMedicalAttachmentResponseDto[];

  constructor(partial: Partial<PatientPlanSessionFilesResponseDto>) {
    Object.assign(this, partial);
  }
}
