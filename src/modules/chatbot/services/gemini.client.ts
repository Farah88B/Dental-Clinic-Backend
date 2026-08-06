export type GeminiChatResult = {
  interactionId: string;
  outputText: string;
};

export type GeminiJsonSchema = {
  type: string;
  properties: Record<string, unknown>;
  required: string[];
};

/**
 * Abstraction over Gemini Interactions API so unit tests can mock it.
 */
export abstract class GeminiClient {
  abstract createTurn(input: {
    message: string;
    systemInstruction: string;
    previousInteractionId?: string | null;
    jsonSchema?: GeminiJsonSchema;
  }): Promise<GeminiChatResult>;

  abstract createFollowUp(input: {
    message: string;
    previousInteractionId: string;
  }): Promise<GeminiChatResult>;
}
