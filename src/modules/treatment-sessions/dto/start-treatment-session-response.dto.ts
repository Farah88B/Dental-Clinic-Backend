import { ApiProperty } from '@nestjs/swagger';
import { EncounterResponseDto } from 'src/modules/encounters/dto/encounter-response.dto';

export class NextPendingSessionDto {
  @ApiProperty() id!: number;
  @ApiProperty() sessionOrder!: number;
  @ApiProperty() title!: string;
  @ApiProperty({ required: false, nullable: true }) durationMinutes!: number | null;
  @ApiProperty({ description: 'Decimal serialized as string' }) estimatedCost!: string;
  @ApiProperty({ required: false, nullable: true }) minDaysBeforeBooking!: number | null;
  @ApiProperty({ required: false, nullable: true }) availableForBookingAt!: Date | null;
  @ApiProperty({
    description: 'availableForBookingAt when set, otherwise today + minDaysBeforeBooking',
  })
  suggestedBookingDate!: Date;

  constructor(partial: Partial<NextPendingSessionDto>) {
    Object.assign(this, partial);
  }
}

export class StartTreatmentSessionResponseDto {
  @ApiProperty({ type: EncounterResponseDto })
  encounter!: EncounterResponseDto;

  @ApiProperty({ type: NextPendingSessionDto, nullable: true, required: false })
  nextSession!: NextPendingSessionDto | null;

  constructor(partial: Partial<StartTreatmentSessionResponseDto>) {
    Object.assign(this, partial);
  }
}
