import { ApiProperty } from '@nestjs/swagger';
import { TreatmentSessionResponseDto } from './treatment-session-response.dto';

export class PendingRatingWithSessionDto {
  @ApiProperty()
  treatmentSessionId!: number;

  @ApiProperty({ format: 'date-time' })
  completedAt!: string;

  @ApiProperty({ format: 'date-time' })
  canRateUntil!: string;

  @ApiProperty({ type: TreatmentSessionResponseDto })
  session!: TreatmentSessionResponseDto;

  constructor(partial: Partial<PendingRatingWithSessionDto>) {
    Object.assign(this, partial);
  }
}

export class PatientHomeResponseDto {
  @ApiProperty({ type: PendingRatingWithSessionDto, nullable: true })
  pendingRating!: PendingRatingWithSessionDto | null;

  constructor(partial: Partial<PatientHomeResponseDto>) {
    Object.assign(this, partial);
  }
}
