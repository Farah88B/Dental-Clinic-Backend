import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsGateway } from './sms-gateway.interface';

/** Convert stored Syrian 09xxxxxxxx to E.164 for SMS gateways. */
export function toInternationalSyrianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('963') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('09') && digits.length === 10) {
    return `+963${digits.slice(1)}`;
  }
  if (digits.startsWith('9') && digits.length === 9) {
    return `+963${digits}`;
  }

  return phone.startsWith('+') ? phone : `+${digits}`;
}

@Injectable()
export class TraccarSmsGateway implements SmsGateway {
  private readonly logger = new Logger(TraccarSmsGateway.name);

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, message: string): Promise<void> {
    const apiUrl = this.config.getOrThrow<string>('sms.apiUrl');
    const apiKey = (this.config.getOrThrow<string>('sms.apiKey') ?? '').trim();
    const to = toInternationalSyrianPhone(phone);

    this.logger.log(`Sending SMS via Traccar to ${to} (${apiUrl})`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          to,
          message,
        }),
      });

      const body = await response.text().catch(() => '');

      if (!response.ok) {
        this.logger.error(
          `SMS gateway ${response.status} for ${to}: ${body || '(empty body)'}`,
        );
        throw new ServiceUnavailableException('Failed to send SMS');
      }

      this.logger.log(
        `SMS accepted by Traccar for ${to} (${response.status})${body ? `: ${body}` : ''}`,
      );
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        `Failed to send SMS to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException('Failed to send SMS');
    }
  }
}
