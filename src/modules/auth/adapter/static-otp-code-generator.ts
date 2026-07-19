// modules/auth/adapter/static-otp-code-generator.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpCodeGenerator } from './otp-code-generator.interface';

@Injectable()
export class StaticOtpCodeGenerator implements OtpCodeGenerator {
  constructor(private readonly config: ConfigService) {}

  generate(): string {
    return this.config.get<string>('sms.staticOtpCode') ?? '123456';
  }
}