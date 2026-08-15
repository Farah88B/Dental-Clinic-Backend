import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsGateway } from './sms-gateway.interface';
import { toInternationalSyrianPhone } from './traccar-sms.gateway';

@Injectable()
export class SmsChefSmsGateway implements SmsGateway {
  private readonly logger = new Logger(SmsChefSmsGateway.name);

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, message: string): Promise<void> {
    const apiUrl = this.config.getOrThrow<string>('sms.apiUrl');
    const secret = (this.config.getOrThrow<string>('sms.apiKey') ?? '').trim();
    const device = (this.config.getOrThrow<string>('sms.deviceId') ?? '').trim();
    const sim = String(this.config.get<number>('sms.sim') ?? 1);
    const to = toInternationalSyrianPhone(phone);

    this.logger.log(`Sending SMS via SMSChef to ${to} (${apiUrl})`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          secret,
          mode: 'devices',
          device,
          sim,
          priority: '0',
          phone: to,
          message,
        }),
      });

      const body = await response.text().catch(() => '');
      let parsed: { status?: number | string; message?: string } | null = null;

      try {
        parsed = body ? (JSON.parse(body) as { status?: number | string; message?: string }) : null;
      } catch {
        parsed = null;
      }

      const apiStatus = parsed?.status != null ? Number(parsed.status) : NaN;
      const accepted =
        response.ok && (Number.isNaN(apiStatus) || apiStatus === 200 || apiStatus === 201);

      if (!accepted) {
        this.logger.error(
          `SMSChef gateway ${response.status} for ${to}: ${body || '(empty body)'}`,
        );
        throw new ServiceUnavailableException('Failed to send SMS');
      }

      this.logger.log(
        `SMS accepted by SMSChef for ${to} (${response.status})${body ? `: ${body}` : ''}`,
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
