import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { NOTIFICATION_ERROR_CODES } from 'src/common/constants/notification.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { DeviceTokenAdapter } from '../adapter/device-token.adapter';
import {
  CreateDeviceTokenDto,
  RevokeDeviceTokenDto,
} from '../dto/create-device-token.dto';
import { DeviceTokenResponseDto } from '../dto/notification-response.dto';
import { deviceTokenSelect } from '../selectors/device-token.select';

@Injectable()
export class DeviceTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: DeviceTokenAdapter,
  ) {}

  async register(
    accountId: number,
    dto: CreateDeviceTokenDto,
    fallbackUserAgent?: string,
  ): Promise<DeviceTokenResponseDto> {
    const token = dto.token.trim();
    if (!token) {
      throw new BadRequestException(
        NOTIFICATION_ERROR_CODES.INVALID_DEVICE_TOKEN,
      );
    }

    const userAgent = dto.userAgent?.trim() || fallbackUserAgent?.trim() || null;

    const existing = await this.prisma.deviceToken.findUnique({
      where: { token },
      select: deviceTokenSelect,
    });

    if (!existing) {
      const created = await this.prisma.deviceToken.create({
        data: {
          accountId,
          token,
          platform: dto.platform,
          userAgent,
        },
        select: deviceTokenSelect,
      });
      return this.adapter.adapt(created);
    }

    const updated = await this.prisma.deviceToken.update({
      where: { token },
      data: {
        accountId,
        platform: dto.platform,
        userAgent,
      },
      select: deviceTokenSelect,
    });
    return this.adapter.adapt(updated);
  }

  async revoke(accountId: number, dto: RevokeDeviceTokenDto): Promise<void> {
    const token = dto.token.trim();
    if (!token) {
      throw new BadRequestException(
        NOTIFICATION_ERROR_CODES.INVALID_DEVICE_TOKEN,
      );
    }

    const existing = await this.prisma.deviceToken.findUnique({
      where: { token },
      select: { id: true, accountId: true },
    });

    if (!existing) {
      return;
    }

    if (existing.accountId !== accountId) {
      throw new ForbiddenException(
        NOTIFICATION_ERROR_CODES.DEVICE_TOKEN_FORBIDDEN,
      );
    }

    await this.prisma.deviceToken.delete({ where: { id: existing.id } });
  }

  async findAccountTokens(accountId: number): Promise<
    Array<{ token: string; platform: DevicePlatform }>
  > {
    return this.prisma.deviceToken.findMany({
      where: { accountId },
      select: { token: true, platform: true },
    });
  }

  async deleteTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }
    await this.prisma.deviceToken.deleteMany({
      where: { token: { in: tokens } },
    });
  }
}
