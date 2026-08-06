import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CHATBOT_CONSTANTS,
  CHATBOT_ERROR_CODES,
  ChatbotMode,
} from 'src/common/constants/chatbot.constants';
import {
  EDUCATION_SYSTEM_PROMPT,
  SUMMARIZE_PROMPT,
  TRIAGE_SYSTEM_PROMPT,
} from '../prompts/chatbot.prompts';
import {
  ChatbotMessageResponseDto,
  ChatbotSummaryResponseDto,
} from '../dto/chatbot-response.dto';
import { GeminiClient, GeminiJsonSchema } from './gemini.client';

const TRIAGE_SCHEMA: GeminiJsonSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    readyForSummary: { type: 'boolean' },
    isEmergency: { type: 'boolean' },
  },
  required: ['reply', 'readyForSummary', 'isEmergency'],
};

const EDUCATION_SCHEMA: GeminiJsonSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    isEmergency: { type: 'boolean' },
  },
  required: ['reply', 'isEmergency'],
};

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(private readonly gemini: GeminiClient) {}

  async sendMessage(input: {
    mode: ChatbotMode;
    message: string;
    previousInteractionId?: string;
    turnCount: number;
  }): Promise<ChatbotMessageResponseDto> {
    const maxTurns =
      input.mode === ChatbotMode.TRIAGE
        ? CHATBOT_CONSTANTS.TRIAGE_MAX_TURNS
        : CHATBOT_CONSTANTS.EDUCATION_MAX_TURNS;

    if (input.turnCount >= maxTurns) {
      return new ChatbotMessageResponseDto({
        reply: null,
        readyForSummary: input.mode === ChatbotMode.TRIAGE,
        forcedByLimit: true,
        isEmergency: false,
        interactionId: input.previousInteractionId ?? null,
      });
    }

    const systemInstruction =
      input.mode === ChatbotMode.TRIAGE
        ? TRIAGE_SYSTEM_PROMPT
        : EDUCATION_SYSTEM_PROMPT;

    const jsonSchema =
      input.mode === ChatbotMode.TRIAGE ? TRIAGE_SCHEMA : EDUCATION_SCHEMA;

    const result = await this.gemini.createTurn({
      message: input.message,
      systemInstruction,
      previousInteractionId: input.previousInteractionId,
      jsonSchema,
    });

    const parsed = this.parseJsonReply(result.outputText, input.mode);

    return new ChatbotMessageResponseDto({
      reply: parsed.reply,
      readyForSummary:
        input.mode === ChatbotMode.TRIAGE ? parsed.readyForSummary : false,
      forcedByLimit: false,
      isEmergency: parsed.isEmergency,
      interactionId: result.interactionId,
    });
  }

  async summarize(
    previousInteractionId: string,
  ): Promise<ChatbotSummaryResponseDto> {
    if (!previousInteractionId?.trim()) {
      throw new BadRequestException(
        CHATBOT_ERROR_CODES.CHATBOT_SUMMARIZE_INVALID,
      );
    }

    const result = await this.gemini.createFollowUp({
      message: SUMMARIZE_PROMPT,
      previousInteractionId,
    });

    const summary = result.outputText.trim();
    if (!summary) {
      throw new BadRequestException(
        CHATBOT_ERROR_CODES.CHATBOT_SUMMARIZE_INVALID,
      );
    }

    return new ChatbotSummaryResponseDto({ summary });
  }

  private parseJsonReply(
    raw: string,
    mode: ChatbotMode,
  ): {
    reply: string;
    readyForSummary: boolean;
    isEmergency: boolean;
  } {
    const fallbackReply =
      mode === ChatbotMode.TRIAGE
        ? 'شكراً، هل يمكنك وصف ما تشعر به بمزيد من التفصيل؟'
        : 'عذراً، لم أتمكن من صياغة الرد. أعد صياغة سؤالك عن صحة الأسنان من فضلك.';

    try {
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const data = JSON.parse(cleaned) as Record<string, unknown>;
      const reply =
        typeof data.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : fallbackReply;

      return {
        reply,
        readyForSummary: data.readyForSummary === true,
        isEmergency: data.isEmergency === true,
      };
    } catch {
      this.logger.warn('Failed to parse chatbot JSON; using raw/fallback text');
      const trimmed = raw.trim();
      return {
        reply: trimmed || fallbackReply,
        readyForSummary: false,
        isEmergency: false,
      };
    }
  }
}
