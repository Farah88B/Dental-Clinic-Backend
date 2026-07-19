// modules/auth/adapter/otp-code-generator.interface.ts
export interface OtpCodeGenerator {
  generate(): string;
}