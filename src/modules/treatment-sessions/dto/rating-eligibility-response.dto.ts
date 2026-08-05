import { ApiProperty } from '@nestjs/swagger';

export class RatingEligibilityResponseDto {
  @ApiProperty() canRate!: boolean;
  @ApiProperty({ required: false, nullable: true }) expiresAt!: Date | null;

  constructor(partial: Partial<RatingEligibilityResponseDto>) {
    Object.assign(this, partial);
  }
}
