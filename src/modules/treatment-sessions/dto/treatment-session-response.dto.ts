import { ApiProperty } from '@nestjs/swagger';
import { TreatmentSessionStatus } from '@prisma/client';

export class TreatmentSessionResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() treatmentPlanId!: number;
  @ApiProperty() title!: string;
  @ApiProperty() sessionOrder!: number;
  @ApiProperty({ required: false, nullable: true }) durationMinutes!: number | null;
  @ApiProperty({ required: false, nullable: true }) minDaysBeforeBooking!: number | null;
  @ApiProperty() estimatedCost!: string;
  @ApiProperty({ required: false, nullable: true }) actualCost!: string | null;
  @ApiProperty({ required: false, nullable: true }) availableForBookingAt!: Date | null;
  @ApiProperty({ enum: TreatmentSessionStatus }) status!: TreatmentSessionStatus;
  @ApiProperty({ required: false, nullable: true }) completedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true }) rating!: number | null;
  @ApiProperty({ required: false, nullable: true }) ratedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<TreatmentSessionResponseDto>) {
    Object.assign(this, partial);
  }
}
