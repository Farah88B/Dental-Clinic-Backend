import { ApiProperty } from '@nestjs/swagger';

export class TreatmentSessionTemplateResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() planTemplateId!: number;
  @ApiProperty() title!: string;
  @ApiProperty() sessionOrder!: number;
  @ApiProperty({ required: false, nullable: true }) durationMinutes!: number | null;
  @ApiProperty({ required: false, nullable: true }) minDaysBeforeBooking!: number | null;
  @ApiProperty({ description: 'Decimal serialized as string' }) estimatedCost!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<TreatmentSessionTemplateResponseDto>) {
    Object.assign(this, partial);
  }
}
