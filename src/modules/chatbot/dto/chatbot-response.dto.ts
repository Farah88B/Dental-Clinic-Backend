import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatbotMessageResponseDto {
  @ApiProperty({ nullable: true })
  reply!: string | null;

  @ApiProperty({
    description: 'TRIAGE only — FE may highlight summarize CTA',
  })
  readyForSummary!: boolean;

  @ApiProperty()
  forcedByLimit!: boolean;

  @ApiPropertyOptional()
  isEmergency?: boolean;

  @ApiProperty({ nullable: true })
  interactionId!: string | null;

  constructor(partial: Partial<ChatbotMessageResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ChatbotSummaryResponseDto {
  @ApiProperty()
  summary!: string;

  constructor(partial: Partial<ChatbotSummaryResponseDto>) {
    Object.assign(this, partial);
  }
}
