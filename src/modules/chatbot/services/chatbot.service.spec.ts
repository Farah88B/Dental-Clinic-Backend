import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CHATBOT_CONSTANTS,
  CHATBOT_ERROR_CODES,
  ChatbotMode,
} from 'src/common/constants/chatbot.constants';
import { ChatbotService } from './chatbot.service';
import { GeminiClient } from './gemini.client';

describe('ChatbotService', () => {
  let service: ChatbotService;

  const gemini = {
    createTurn: jest.fn(),
    createFollowUp: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: GeminiClient, useValue: gemini },
      ],
    }).compile();
    service = moduleRef.get(ChatbotService);
  });

  it('forces summarize when triage turn limit is reached', async () => {
    const result = await service.sendMessage({
      mode: ChatbotMode.TRIAGE,
      message: 'وجع',
      turnCount: CHATBOT_CONSTANTS.TRIAGE_MAX_TURNS,
      previousInteractionId: 'prev-1',
    });

    expect(result.forcedByLimit).toBe(true);
    expect(result.readyForSummary).toBe(true);
    expect(result.reply).toBeNull();
    expect(gemini.createTurn).not.toHaveBeenCalled();
  });

  it('parses triage JSON and returns readyForSummary', async () => {
    gemini.createTurn.mockResolvedValue({
      interactionId: 'ix-1',
      outputText: JSON.stringify({
        reply: 'أين يقع الألم؟',
        readyForSummary: false,
        isEmergency: false,
      }),
    });

    const result = await service.sendMessage({
      mode: ChatbotMode.TRIAGE,
      message: 'وجع ضرس',
      turnCount: 0,
    });

    expect(result.reply).toBe('أين يقع الألم؟');
    expect(result.interactionId).toBe('ix-1');
    expect(result.readyForSummary).toBe(false);
  });

  it('never sets readyForSummary for education mode', async () => {
    gemini.createTurn.mockResolvedValue({
      interactionId: 'ix-2',
      outputText: JSON.stringify({
        reply: 'ينصح بتنظيف الأسنان مرتين يومياً.',
        isEmergency: false,
      }),
    });

    const result = await service.sendMessage({
      mode: ChatbotMode.EDUCATION,
      message: 'كيف أنظف أسناني؟',
      turnCount: 0,
    });

    expect(result.readyForSummary).toBe(false);
    expect(result.reply).toContain('تنظيف');
  });

  it('summarizes a triage conversation', async () => {
    gemini.createFollowUp.mockResolvedValue({
      interactionId: 'ix-3',
      outputText: 'المريض ذكر ألماً في الضرس منذ يومين.',
    });

    const result = await service.summarize('ix-2');
    expect(result.summary).toContain('ألماً');
  });

  it('rejects empty summarize id', async () => {
    await expect(service.summarize('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.summarize('')).rejects.toThrow(
      CHATBOT_ERROR_CODES.CHATBOT_SUMMARIZE_INVALID,
    );
  });
});
