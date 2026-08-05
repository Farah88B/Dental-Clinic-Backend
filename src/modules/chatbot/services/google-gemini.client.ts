import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import {
  CHATBOT_CONSTANTS,
  CHATBOT_ERROR_CODES,
} from 'src/common/constants/chatbot.constants';
import {
  GeminiChatResult,
  GeminiClient,
  GeminiJsonSchema,
} from './gemini.client';

@Injectable()
export class GoogleGeminiClient extends GeminiClient {
  private readonly logger = new Logger(GoogleGeminiClient.name);
  private readonly ai: GoogleGenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>('gemini.apiKey') ?? '';
    this.model =
      this.configService.get<string>('gemini.model') ??
      CHATBOT_CONSTANTS.DEFAULT_MODEL;
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async createTurn(input: {
    message: string;
    systemInstruction: string;
    previousInteractionId?: string | null;
    jsonSchema?: GeminiJsonSchema;
  }): Promise<GeminiChatResult> {
    return this.runInteraction({
      input: input.message,
      system_instruction: input.systemInstruction,
      previous_interaction_id: input.previousInteractionId ?? undefined,
      response_format: input.jsonSchema
        ? {
            type: 'text' as const,
            mime_type: 'application/json' as const,
            schema: input.jsonSchema,
          }
        : undefined,
    });
  }

  async createFollowUp(input: {
    message: string;
    previousInteractionId: string;
  }): Promise<GeminiChatResult> {
    return this.runInteraction({
      input: input.message,
      previous_interaction_id: input.previousInteractionId,
    });
  }

  private async runInteraction(params: {
    input: string;
    system_instruction?: string;
    previous_interaction_id?: string;
    response_format?: {
      type: 'text';
      mime_type: 'application/json' | 'text/plain';
      schema?: GeminiJsonSchema;
    };
  }): Promise<GeminiChatResult> {
    if (!this.ai) {
      throw new ServiceUnavailableException(
        CHATBOT_ERROR_CODES.CHATBOT_UNAVAILABLE,
      );
    }

    try {
      const interaction = await this.ai.interactions.create({
        model: this.model,
        ...params,
      });

      const outputText = interaction.output_text?.trim() ?? '';
      if (!interaction.id) {
        throw new Error('Gemini interaction missing id');
      }

      return {
        interactionId: interaction.id,
        outputText,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        {
          err: error instanceof Error ? error.message : String(error),
        },
        'Gemini interaction failed',
      );
      throw new ServiceUnavailableException(
        CHATBOT_ERROR_CODES.CHATBOT_UNAVAILABLE,
      );
    }
  }
}
