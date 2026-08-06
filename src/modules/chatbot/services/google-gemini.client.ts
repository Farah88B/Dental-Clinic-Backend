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
    // #region agent log
    fetch('http://127.0.0.1:7564/ingest/78ba0ab3-38f9-48ac-adfb-dc88ebea651c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5c963'},body:JSON.stringify({sessionId:'b5c963',runId:'pre-fix',hypothesisId:'A',location:'google-gemini.client.ts:constructor',message:'Gemini client init',data:{hasApiKey:Boolean(apiKey),apiKeyLength:apiKey.length,model:this.model,aiInitialized:Boolean(this.ai)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7564/ingest/78ba0ab3-38f9-48ac-adfb-dc88ebea651c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5c963'},body:JSON.stringify({sessionId:'b5c963',runId:'pre-fix',hypothesisId:'A',location:'google-gemini.client.ts:runInteraction',message:'runInteraction entry',data:{aiNull:!this.ai,model:this.model,hasPrevId:Boolean(params.previous_interaction_id),hasSchema:Boolean(params.response_format?.schema)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!this.ai) {
      // #region agent log
      fetch('http://127.0.0.1:7564/ingest/78ba0ab3-38f9-48ac-adfb-dc88ebea651c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5c963'},body:JSON.stringify({sessionId:'b5c963',runId:'pre-fix',hypothesisId:'A',location:'google-gemini.client.ts:runInteraction:noAi',message:'CHATBOT_UNAVAILABLE due to missing Gemini client',data:{reason:'ai_null_no_api_key'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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

      // #region agent log
      fetch('http://127.0.0.1:7564/ingest/78ba0ab3-38f9-48ac-adfb-dc88ebea651c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5c963'},body:JSON.stringify({sessionId:'b5c963',runId:'pre-fix',hypothesisId:'D',location:'google-gemini.client.ts:runInteraction:success',message:'Gemini interaction ok',data:{interactionIdLen:interaction.id.length,outputLen:outputText.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      return {
        interactionId: interaction.id,
        outputText,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      // #region agent log
      fetch('http://127.0.0.1:7564/ingest/78ba0ab3-38f9-48ac-adfb-dc88ebea651c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5c963'},body:JSON.stringify({sessionId:'b5c963',runId:'pre-fix',hypothesisId:'D',location:'google-gemini.client.ts:runInteraction:catch',message:'Gemini API call failed',data:{err:error instanceof Error ? error.message : String(error),errName:error instanceof Error ? error.name : typeof error},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
