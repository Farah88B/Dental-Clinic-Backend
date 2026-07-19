// modules/auth/adapter/random-otp-code-generator.ts
import { Injectable } from '@nestjs/common';
import { OtpCodeGenerator } from './otp-code-generator.interface';

@Injectable()
export class RandomOtpCodeGenerator implements OtpCodeGenerator {
  generate(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}