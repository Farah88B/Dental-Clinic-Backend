// modules/auth/adapter/sms-gateway.stub.ts
import { Injectable, Logger } from '@nestjs/common';
import { SmsGateway } from './sms-gateway.interface';

// Stub: logs instead of actually sending. Swap for a real provider later
// by implementing SmsGateway and changing the provider binding in
// auth.module.ts — nothing else in the app needs to change.
@Injectable()
export class SmsGatewayStub implements SmsGateway {
  private readonly logger = new Logger(SmsGatewayStub.name);

  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`[SMS STUB] to ${phone}: ${message}`);
  }
}