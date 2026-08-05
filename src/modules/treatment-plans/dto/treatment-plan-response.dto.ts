import { ApiProperty } from '@nestjs/swagger';
import { TreatmentPlanStatus } from '@prisma/client';
import { TreatmentSessionResponseDto } from 'src/modules/treatment-sessions/dto/treatment-session-response.dto';

export class TreatmentPlanTemplateSummaryResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;

  constructor(partial: Partial<TreatmentPlanTemplateSummaryResponseDto>) {
    Object.assign(this, partial);
  }
}

export class TreatmentPlanResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() patientId!: number;
  @ApiProperty({ required: false, nullable: true }) createdByAccountId!: number | null;
  @ApiProperty({ required: false, nullable: true }) templateId!: number | null;
  @ApiProperty({ required: false, nullable: true }) name!: string | null;
  @ApiProperty({ required: false, nullable: true, type: TreatmentPlanTemplateSummaryResponseDto })
  template!: TreatmentPlanTemplateSummaryResponseDto | null;
  @ApiProperty({ enum: TreatmentPlanStatus }) status!: TreatmentPlanStatus;
  @ApiProperty() estimatedCost!: string;
  @ApiProperty() actualCost!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ description: 'Completed sessions / non-cancelled sessions * 100, rounded' })
  progressPercent!: number;
  @ApiProperty({ description: 'Count of COMPLETED sessions' })
  completedSessions!: number;
  @ApiProperty({ description: 'Count of non-cancelled sessions' })
  totalSessions!: number;
  @ApiProperty({ type: [TreatmentSessionResponseDto] }) sessions!: TreatmentSessionResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<TreatmentPlanResponseDto>) {
    Object.assign(this, partial);
  }
}
