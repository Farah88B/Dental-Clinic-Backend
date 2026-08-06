import { Module } from '@nestjs/common';
import { ChatbotAppController } from './controllers/chatbot-app.controller';
import { ChatbotService } from './services/chatbot.service';
import { GeminiClient } from './services/gemini.client';
import { GoogleGeminiClient } from './services/google-gemini.client';

@Module({
  controllers: [ChatbotAppController],
  providers: [
    ChatbotService,
    {
      provide: GeminiClient,
      useClass: GoogleGeminiClient,
    },
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
