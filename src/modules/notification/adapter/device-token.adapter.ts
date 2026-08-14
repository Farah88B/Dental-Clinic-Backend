import { Injectable } from '@nestjs/common';
import { DeviceTokenResponseDto } from '../dto/notification-response.dto';
import { RawDeviceToken } from '../selectors/device-token.select';

@Injectable()
export class DeviceTokenAdapter {
  adapt(raw: RawDeviceToken): DeviceTokenResponseDto {
    return new DeviceTokenResponseDto({
      id: raw.id,
      accountId: raw.accountId,
      platform: raw.platform,
      userAgent: raw.userAgent,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
