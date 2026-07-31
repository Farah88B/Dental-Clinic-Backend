// modules/auth/services/otp.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { SMS_GATEWAY } from '../adapter/sms-gateway.token';
import { OTP_CODE_GENERATOR } from '../adapter/otp-code-generator.token';
import { OTP, OTP_ERROR_CODES } from 'src/common/constants/otp.constants';
import type { SmsGateway } from '../adapter/sms-gateway.interface';
import type { OtpCodeGenerator } from '../adapter/otp-code-generator.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_GATEWAY) private readonly smsGateway: SmsGateway,
    @Inject(OTP_CODE_GENERATOR) private readonly otpCodeGenerator: OtpCodeGenerator,
  ) {}

  // Create and send a fresh OTP for a given account and OTP type.
  async send(accountId: number, phone: string, type: OtpType): Promise<void> {
    const code = this.otpCodeGenerator.generate();
    const expiresAt = new Date(Date.now() + OTP.EXPIRY_MINUTES * 60_000);

    await this.prisma.otpVerification.create({
      data: { accountId, code, type, expiresAt },
    });

    await this.smsGateway.send(phone, `رمز التحقق الخاص بك: ${code}`);
  }

  // Validate the latest OTP for the account/type and mark it used on success.
  async verify(accountId: number, type: OtpType, code: string): Promise<void> {
    const otp = await this.prisma.otpVerification.findFirst({
      where: { accountId, type },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException(OTP_ERROR_CODES.OTP_INVALID);
    if (otp.isUsed) throw new BadRequestException(OTP_ERROR_CODES.OTP_ALREADY_USED);
    if (otp.expiresAt < new Date()) throw new BadRequestException(OTP_ERROR_CODES.OTP_EXPIRED);
    if (otp.attempts >= OTP.MAX_ATTEMPTS) {
      throw new BadRequestException(OTP_ERROR_CODES.OTP_MAX_ATTEMPTS);
    }

    if (otp.code !== code) {
      await this.prisma.otpVerification.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException(OTP_ERROR_CODES.OTP_INVALID);
    }

    await this.prisma.otpVerification.update({
      where: { id: otp.id },
      data: { isUsed: true, verifiedAt: new Date() },
    });
  }

  // Send an OTP while storing extra JSON metadata for later use.
  async sendWithMetadata(
    accountId: number,
    phone: string,
    type: OtpType,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    const code = this.otpCodeGenerator.generate();
    const expiresAt = new Date(Date.now() + OTP.EXPIRY_MINUTES * 60_000);

    await this.prisma.otpVerification.create({
      data: { accountId, code, type, expiresAt, metadata },
    });

    await this.smsGateway.send(phone, `رمز التحقق الخاص بك: ${code}`);
  }

  // Validate the OTP and return the stored row, including metadata.
  async verifyAndReturnMetadata(accountId: number, type: OtpType, code: string) {
    const otp = await this.prisma.otpVerification.findFirst({
      where: { accountId, type },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException(OTP_ERROR_CODES.OTP_INVALID);
    if (otp.isUsed) throw new BadRequestException(OTP_ERROR_CODES.OTP_ALREADY_USED);
    if (otp.expiresAt < new Date()) throw new BadRequestException(OTP_ERROR_CODES.OTP_EXPIRED);
    if (otp.attempts >= OTP.MAX_ATTEMPTS) {
      throw new BadRequestException(OTP_ERROR_CODES.OTP_MAX_ATTEMPTS);
    }
    if (otp.code !== code) {
      await this.prisma.otpVerification.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException(OTP_ERROR_CODES.OTP_INVALID);
    }

    return this.prisma.otpVerification.update({
      where: { id: otp.id },
      data: { isUsed: true, verifiedAt: new Date() },
    });
  }
}