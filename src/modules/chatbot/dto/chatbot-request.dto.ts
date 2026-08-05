import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ChatbotMode } from 'src/common/constants/chatbot.constants';

export class ChatbotMessageDto {
  @ApiProperty({ enum: ChatbotMode })
  @IsEnum(ChatbotMode)
  mode!: ChatbotMode;

  @ApiProperty({ example: 'عندي وجع في ضرسي من يومين' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Gemini interaction id from the previous turn',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  previousInteractionId?: string;

  @ApiProperty({
    description: '0-based count of user messages already sent in this chat',
    example: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  turnCount!: number;
}

export class ChatbotSummarizeDto {
  @ApiProperty({
    description: 'Last TRIAGE interaction id to summarize',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  previousInteractionId!: string;
}
