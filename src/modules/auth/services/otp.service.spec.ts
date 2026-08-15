import { Test, TestingModule } from '@nestjs/testing';
import { OtpType } from '@prisma/client';
import { OtpService } from './otp.service';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { SMS_GATEWAY } from '../adapter/sms-gateway.token';
import { OTP_CODE_GENERATOR } from '../adapter/otp-code-generator.token';
import { RandomOtpCodeGenerator } from '../adapter/random-otp-code-generator';

describe('OtpService', () => {
  let service: OtpService;

  const prismaMock = {
    otpVerification: {
      findFirst: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const smsGatewayMock = { send: jest.fn() };
  const otpCodeGeneratorMock = { generate: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SMS_GATEWAY, useValue: smsGatewayMock },
        { provide: OTP_CODE_GENERATOR, useValue: otpCodeGeneratorMock },
      ],
    }).compile();

    service = module.get(OtpService);
    jest.clearAllMocks();
    prismaMock.otpVerification.findFirst.mockResolvedValue(null);
    prismaMock.otpVerification.count.mockResolvedValue(0);
    prismaMock.otpVerification.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.otpVerification.create.mockResolvedValue({});
    smsGatewayMock.send.mockResolvedValue(undefined);
  });

  it('send returns the generated code (random, not fixed)', async () => {
    otpCodeGeneratorMock.generate.mockReturnValue('472819');

    const code = await service.send(1, '0912345678', OtpType.REGISTER);

    expect(code).toBe('472819');
    expect(code).not.toBe('123456');
    expect(prismaMock.otpVerification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: '472819', type: OtpType.REGISTER }),
      }),
    );
    expect(smsGatewayMock.send).toHaveBeenCalledWith(
      '0912345678',
      'Senni Dental Clinic\nYour code: 472819',
    );
  });

  it('sendWithMetadata returns the generated code', async () => {
    otpCodeGeneratorMock.generate.mockReturnValue('918273');

    const code = await service.sendWithMetadata(1, '0999999999', OtpType.CHANGE_PHONE, {
      newPhone: '0999999999',
    });

    expect(code).toBe('918273');
  });

  it('verify accepts the same code that send returned', async () => {
    otpCodeGeneratorMock.generate.mockReturnValue('334455');
    await service.send(1, '0912345678', OtpType.RESET_PASSWORD);

    prismaMock.otpVerification.findFirst.mockResolvedValue({
      id: 10,
      code: '334455',
      isUsed: false,
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    });
    prismaMock.otpVerification.update.mockResolvedValue({});

    await expect(service.verify(1, OtpType.RESET_PASSWORD, '334455')).resolves.toBeUndefined();
  });
});

describe('RandomOtpCodeGenerator', () => {
  it('generates a 6-digit numeric code', () => {
    const generator = new RandomOtpCodeGenerator();
    const code = generator.generate();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('is not stuck on the old static stub value', () => {
    const generator = new RandomOtpCodeGenerator();
    const codes = new Set(Array.from({ length: 20 }, () => generator.generate()));
    // Extremely unlikely that 20 random codes all equal 123456
    expect(codes.has('123456') && codes.size === 1).toBe(false);
  });
});
