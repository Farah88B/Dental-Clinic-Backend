import { Injectable, Logger } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { toUiLanguage } from 'src/common/i18n/localize.helper';
import { NotificationAdapter } from '../adapter/notification.adapter';
import {
  NotificationResponseDto,
  NotifyAccountInput,
} from '../dto/notification-response.dto';
import { notificationSelect } from '../selectors/notification.select';
import { DeviceTokenService } from './device-token.service';
import { FirebaseService } from './firebase.service';
import { NotificationGateway } from '../gateways/notification.gateway';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: NotificationAdapter,
    private readonly deviceTokenService: DeviceTokenService,
    private readonly firebaseService: FirebaseService,
    private readonly gateway: NotificationGateway,
  ) {}

  async dispatch(
    input: NotifyAccountInput,
  ): Promise<NotificationResponseDto | null> {
    const account = await this.prisma.account.findUnique({
      where: { id: input.accountId },
      select: { id: true, status: true, preferredLanguage: true },
    });

    if (!account) {
      this.logger.warn(
        `Skip notification: account ${input.accountId} not found`,
      );
      return null;
    }

    if (account.status === AccountStatus.DISABLED) {
      this.logger.debug(
        `Skip notification: account ${account.id} is DISABLED`,
      );
      return null;
    }

    const created = await this.prisma.notification.create({
      data: {
        accountId: account.id,
        type: input.type,
        titleAr: input.titleAr,
        titleEn: input.titleEn,
        bodyAr: input.bodyAr,
        bodyEn: input.bodyEn,
        data: (input.data ?? undefined) as object | undefined,
      },
      select: notificationSelect,
    });

    const language = toUiLanguage(account.preferredLanguage);
    const dto = this.adapter.adapt(created, language);

    void this.deliver(account.id, dto).catch((error: unknown) => {
      this.logger.warn({
        accountId: account.id,
        notificationId: dto.id,
        error: error instanceof Error ? error.message : String(error),
        msg: 'Notification delivery failed after persist',
      });
    });

    return dto;
  }

  private async deliver(
    accountId: number,
    dto: NotificationResponseDto,
  ): Promise<void> {
    try {
      this.gateway.emitCreated(accountId, dto);
    } catch (error) {
      this.logger.warn({
        accountId,
        notificationId: dto.id,
        error: error instanceof Error ? error.message : String(error),
        msg: 'Socket emit failed',
      });
    }

    const tokens = await this.deviceTokenService.findAccountTokens(accountId);
    if (tokens.length === 0) {
      return;
    }

    const data = this.toFcmData(dto);
    const results = await this.firebaseService.sendToTokens({
      tokens: tokens.map((item) => item.token),
      title: dto.title,
      body: dto.body,
      data,
    });

    const invalid = results
      .filter((result) => !result.success && result.permanent)
      .map((result) => result.token);

    if (invalid.length > 0) {
      await this.deviceTokenService.deleteTokens(invalid);
      this.logger.warn(
        `Removed ${invalid.length} permanently invalid FCM token(s) for account ${accountId}`,
      );
    }

    const temporaryFailures = results.filter(
      (result) => !result.success && !result.permanent,
    );
    if (temporaryFailures.length > 0) {
      this.logger.warn({
        accountId,
        notificationId: dto.id,
        failures: temporaryFailures.map((item) => ({
          errorCode: item.errorCode,
        })),
        msg: 'Temporary FCM failures — tokens kept',
      });
    }
  }

  private toFcmData(dto: NotificationResponseDto): Record<string, string> {
    const payload: Record<string, string> = {
      notificationId: String(dto.id),
      type: dto.type,
      isRead: String(dto.isRead),
    };

    if (dto.data) {
      for (const [key, value] of Object.entries(dto.data)) {
        if (value == null) {
          continue;
        }
        payload[key] =
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value);
      }
    }

    return payload;
  }
}
