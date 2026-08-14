import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { NotificationAdapter } from '../adapter/notification.adapter';
import { NotificationListQueryDto } from '../dto/notification-list-query.dto';
import {
  NotificationCountResponseDto,
  NotificationListResponseDto,
  NotificationResponseDto,
  NotifyAccountInput,
} from '../dto/notification-response.dto';
import { notificationSelect } from '../selectors/notification.select';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: NotificationAdapter,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  notifyAccount(
    input: NotifyAccountInput,
  ): Promise<NotificationResponseDto | null> {
    return this.dispatcher.dispatch(input);
  }

  async listForAccount(
    accountId: number,
    query: NotificationListQueryDto,
    language: 'ar' | 'en',
  ): Promise<NotificationListResponseDto> {
    const where = {
      accountId,
      ...(query.isRead === true ? { readAt: { not: null } } : {}),
      ...(query.isRead === false ? { readAt: null } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        select: notificationSelect,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return new NotificationListResponseDto(
      rows.map((row) => this.adapter.adapt(row, language)),
      total,
    );
  }

  async unreadCount(accountId: number): Promise<NotificationCountResponseDto> {
    const count = await this.prisma.notification.count({
      where: { accountId, readAt: null },
    });
    return new NotificationCountResponseDto(count);
  }

  async markRead(
    accountId: number,
    id: number,
    language: 'ar' | 'en',
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirstOrThrow({
      where: { id, accountId },
      select: notificationSelect,
    });

    if (notification.readAt) {
      return this.adapter.adapt(notification, language);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
      select: notificationSelect,
    });
    return this.adapter.adapt(updated, language);
  }

  async markAllRead(accountId: number): Promise<NotificationCountResponseDto> {
    const result = await this.prisma.notification.updateMany({
      where: { accountId, readAt: null },
      data: { readAt: new Date() },
    });
    return new NotificationCountResponseDto(result.count);
  }

  async delete(
    accountId: number,
    id: number,
    language: 'ar' | 'en',
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirstOrThrow({
      where: { id, accountId },
      select: notificationSelect,
    });

    await this.prisma.notification.delete({
      where: { id: notification.id },
    });

    return this.adapter.adapt(notification, language);
  }
}
