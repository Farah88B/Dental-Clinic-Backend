import { Test } from '@nestjs/testing';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { NotificationAdapter } from '../adapter/notification.adapter';
import { NotificationGateway } from '../gateways/notification.gateway';
import { DeviceTokenService } from './device-token.service';
import { FirebaseService } from './firebase.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationService } from './notification.service';

const now = new Date('2026-08-14T10:00:00.000Z');

function rawNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    accountId: 10,
    type: 'SYSTEM',
    titleAr: 'عنوان',
    titleEn: 'Title',
    bodyAr: 'نص',
    bodyEn: 'Body',
    data: { appointmentId: 12 },
    readAt: null,
    createdAt: now,
    ...overrides,
  };
}

describe('NotificationService', () => {
  let service: NotificationService;

  const prisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
    account: { findUnique: jest.fn() },
  };

  const firebase = {
    sendToTokens: jest.fn(),
  };

  const gateway = {
    emitCreated: jest.fn(),
  };

  const deviceTokens = {
    findAccountTokens: jest.fn(),
    deleteTokens: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        NotificationDispatcherService,
        NotificationAdapter,
        { provide: PrismaService, useValue: prisma },
        { provide: FirebaseService, useValue: firebase },
        { provide: NotificationGateway, useValue: gateway },
        { provide: DeviceTokenService, useValue: deviceTokens },
      ],
    }).compile();
    service = moduleRef.get(NotificationService);
    dispatcher = moduleRef.get(NotificationDispatcherService);
  });

  it('lists only the authenticated account notifications and localizes Arabic', async () => {
    const row = rawNotification();
    prisma.$transaction.mockResolvedValue([[row], 1]);

    const result = await service.listForAccount(
      10,
      { skip: 0, take: 20, page: 1, pageSize: 20 } as never,
      'ar',
    );

    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe('عنوان');
    expect(result.items[0].body).toBe('نص');
    expect(result.items[0].isRead).toBe(false);
  });

  it('localizes English in list', async () => {
    prisma.$transaction.mockResolvedValue([[rawNotification()], 1]);
    const result = await service.listForAccount(
      10,
      { skip: 0, take: 20, page: 1, pageSize: 20 } as never,
      'en',
    );
    expect(result.items[0].title).toBe('Title');
  });

  it('filters unread when isRead is false', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.listForAccount(
      10,
      { skip: 0, take: 20, isRead: false } as never,
      'ar',
    );

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 10, readAt: null },
      }),
    );
  });

  it('filters read when isRead is true', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.listForAccount(
      10,
      { skip: 0, take: 20, isRead: true } as never,
      'ar',
    );

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 10, readAt: { not: null } },
      }),
    );
  });

  it('returns unread count', async () => {
    prisma.notification.count.mockResolvedValue(5);
    await expect(service.unreadCount(10)).resolves.toEqual({ count: 5 });
  });

  it('marks unread notification as read', async () => {
    prisma.notification.findFirstOrThrow.mockResolvedValue(rawNotification());
    prisma.notification.update.mockResolvedValue(
      rawNotification({ readAt: now }),
    );

    const result = await service.markRead(10, 1, 'ar');
    expect(result.isRead).toBe(true);
    expect(prisma.notification.update).toHaveBeenCalled();
  });

  it('is idempotent when marking an already-read notification', async () => {
    prisma.notification.findFirstOrThrow.mockResolvedValue(
      rawNotification({ readAt: now }),
    );

    const result = await service.markRead(10, 1, 'en');
    expect(result.isRead).toBe(true);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('marks all unread as read for the account only', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });
    await expect(service.markAllRead(10)).resolves.toEqual({ count: 3 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { accountId: 10, readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('deletes a notification scoped to the authenticated account', async () => {
    prisma.notification.findFirstOrThrow.mockResolvedValue(rawNotification());
    prisma.notification.delete.mockResolvedValue(rawNotification());

    const result = await service.delete(10, 1, 'ar');

    expect(result.id).toBe(1);
    expect(prisma.notification.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: 1, accountId: 10 },
      select: expect.any(Object),
    });
    expect(prisma.notification.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});

describe('NotificationDispatcherService', () => {
  let dispatcher: NotificationDispatcherService;

  const prisma = {
    account: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
  };

  const firebase = {
    sendToTokens: jest.fn(),
  };

  const gateway = {
    emitCreated: jest.fn(),
  };

  const deviceTokens = {
    findAccountTokens: jest.fn(),
    deleteTokens: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        NotificationAdapter,
        { provide: PrismaService, useValue: prisma },
        { provide: FirebaseService, useValue: firebase },
        { provide: NotificationGateway, useValue: gateway },
        { provide: DeviceTokenService, useValue: deviceTokens },
      ],
    }).compile();
    dispatcher = moduleRef.get(NotificationDispatcherService);
  });

  it('persists even when FCM fails', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 10,
      status: AccountStatus.ACTIVE,
      preferredLanguage: 'AR',
    });
    prisma.notification.create.mockResolvedValue(rawNotification());
    deviceTokens.findAccountTokens.mockResolvedValue([
      { token: 't1', platform: 'ANDROID' },
    ]);
    firebase.sendToTokens.mockRejectedValue(new Error('FCM down'));

    const result = await dispatcher.dispatch({
      accountId: 10,
      type: 'SYSTEM',
      titleAr: 'عنوان',
      titleEn: 'Title',
      bodyAr: 'نص',
      bodyEn: 'Body',
      data: { appointmentId: 12 },
    });

    expect(result?.id).toBe(1);
    expect(prisma.notification.create).toHaveBeenCalled();
    await new Promise((resolve) => setImmediate(resolve));
    expect(gateway.emitCreated).toHaveBeenCalled();
  });

  it('sends to all tokens and emits socket event', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 10,
      status: AccountStatus.ACTIVE,
      preferredLanguage: 'EN',
    });
    prisma.notification.create.mockResolvedValue(rawNotification());
    deviceTokens.findAccountTokens.mockResolvedValue([
      { token: 'android', platform: 'ANDROID' },
      { token: 'web', platform: 'WEB' },
    ]);
    firebase.sendToTokens.mockResolvedValue([
      { token: 'android', success: true, permanent: false },
      { token: 'web', success: true, permanent: false },
    ]);

    await dispatcher.dispatch({
      accountId: 10,
      type: 'SYSTEM',
      titleAr: 'عنوان',
      titleEn: 'Title',
      bodyAr: 'نص',
      bodyEn: 'Body',
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(firebase.sendToTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['android', 'web'],
        title: 'Title',
      }),
    );
    expect(gateway.emitCreated).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ id: 1, title: 'Title' }),
    );
  });

  it('removes permanently invalid FCM tokens', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 10,
      status: AccountStatus.ACTIVE,
      preferredLanguage: 'AR',
    });
    prisma.notification.create.mockResolvedValue(rawNotification());
    deviceTokens.findAccountTokens.mockResolvedValue([
      { token: 'dead', platform: 'ANDROID' },
      { token: 'live', platform: 'WEB' },
    ]);
    firebase.sendToTokens.mockResolvedValue([
      {
        token: 'dead',
        success: false,
        permanent: true,
        errorCode: 'messaging/registration-token-not-registered',
      },
      { token: 'live', success: true, permanent: false },
    ]);

    await dispatcher.dispatch({
      accountId: 10,
      type: 'SYSTEM',
      titleAr: 'عنوان',
      titleEn: 'Title',
      bodyAr: 'نص',
      bodyEn: 'Body',
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(deviceTokens.deleteTokens).toHaveBeenCalledWith(['dead']);
  });

  it('keeps tokens on temporary FCM failure', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 10,
      status: AccountStatus.ACTIVE,
      preferredLanguage: 'AR',
    });
    prisma.notification.create.mockResolvedValue(rawNotification());
    deviceTokens.findAccountTokens.mockResolvedValue([
      { token: 't1', platform: 'ANDROID' },
    ]);
    firebase.sendToTokens.mockResolvedValue([
      {
        token: 't1',
        success: false,
        permanent: false,
        errorCode: 'messaging/unavailable',
      },
    ]);

    await dispatcher.dispatch({
      accountId: 10,
      type: 'SYSTEM',
      titleAr: 'عنوان',
      titleEn: 'Title',
      bodyAr: 'نص',
      bodyEn: 'Body',
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(deviceTokens.deleteTokens).not.toHaveBeenCalled();
  });

  it('skips DISABLED accounts', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 10,
      status: AccountStatus.DISABLED,
      preferredLanguage: 'AR',
    });

    const result = await dispatcher.dispatch({
      accountId: 10,
      type: 'SYSTEM',
      titleAr: 'عنوان',
      titleEn: 'Title',
      bodyAr: 'نص',
      bodyEn: 'Body',
    });

    expect(result).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
