import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  ChatbotMessageDto,
  ChatbotSummarizeDto,
} from '../dto/chatbot-request.dto';
import {
  ChatbotMessageResponseDto,
  ChatbotSummaryResponseDto,
} from '../dto/chatbot-response.dto';
import { ChatbotService } from '../services/chatbot.service';

@ApiTags('Chatbot — Mobile App')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotAppController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @ApiOperation({
    summary:
      'Send a chatbot turn (TRIAGE for booking visit-reason, EDUCATION for home FAQ)',
  })
  @ApiBaseResponse(ChatbotMessageResponseDto)
  sendMessage(@Body() dto: ChatbotMessageDto) {
    return this.chatbotService.sendMessage({
      mode: dto.mode,
      message: dto.message,
      previousInteractionId: dto.previousInteractionId,
      turnCount: dto.turnCount,
    });
  }

  @Post('summarize')
  @ApiOperation({
    summary:
      'Summarize a TRIAGE conversation into editable chatbotSummary text',
  })
  @ApiBaseResponse(ChatbotSummaryResponseDto)
  summarize(@Body() dto: ChatbotSummarizeDto) {
    return this.chatbotService.summarize(dto.previousInteractionId);
  }
}
