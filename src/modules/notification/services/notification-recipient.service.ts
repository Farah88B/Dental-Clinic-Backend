import { Injectable, Logger } from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import {
  NOTIFICATION_TYPES,
  NotificationType,
  STAFF_NOTIFICATION_ROLE_CODES,
} from 'src/common/constants/notification.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { NotifyAccountInput } from '../dto/notification-response.dto';
import { NotificationService } from './notification.service';

export type NotificationPayload = Omit<NotifyAccountInput, 'accountId'>;

@Injectable()
export class NotificationRecipientService {
  private readonly logger = new Logger(NotificationRecipientService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async findStaffAccountIds(): Promise<number[]> {
    const accounts = await this.prisma.account.findMany({
      where: {
        status: AccountStatus.ACTIVE,
        roles: {
          some: {
            role: { code: { in: [...STAFF_NOTIFICATION_ROLE_CODES] } },
          },
        },
      },
      select: { id: true },
    });
    return accounts.map((account) => account.id);
  }

  async notifyStaff(payload: NotificationPayload): Promise<void> {
    const accountIds = await this.findStaffAccountIds();
    await Promise.all(
      accountIds.map((accountId) =>
        this.notificationService.notifyAccount({ ...payload, accountId }),
      ),
    );
  }

  async notifyPatientByPatientId(
    patientId: number,
    payload: NotificationPayload,
  ): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { accountId: true },
    });
    if (!patient?.accountId) {
      return;
    }
    await this.notificationService.notifyAccount({
      ...payload,
      accountId: patient.accountId,
    });
  }

  async hasSentNotification(
    accountId: number,
    type: NotificationType,
    dataFilters: Record<string, unknown>,
  ): Promise<boolean> {
    const dataConditions = Object.entries(dataFilters).map(([key, value]) => ({
      data: {
        path: [key],
        equals: value as Prisma.InputJsonValue,
      },
    }));

    const existing = await this.prisma.notification.findFirst({
      where: {
        accountId,
        type,
        AND: dataConditions,
      },
      select: { id: true },
    });
    return existing != null;
  }

  dispatchSafely(task: Promise<unknown>, context: string): void {
    void task.catch((error: unknown) => {
      this.logger.warn({
        context,
        error: error instanceof Error ? error.message : String(error),
        msg: 'Notification dispatch failed',
      });
    });
  }
}