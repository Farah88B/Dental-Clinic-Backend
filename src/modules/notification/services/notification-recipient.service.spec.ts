import { Test } from '@nestjs/testing';
import { AccountStatus } from '@prisma/client';
import { NOTIFICATION_TYPES } from 'src/common/constants/notification.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { NotificationService } from './notification.service';
import { NotificationRecipientService } from './notification-recipient.service';

describe('NotificationRecipientService', () => {
  let service: NotificationRecipientService;

  const prisma = {
    account: { findMany: jest.fn() },
    patient: { findUnique: jest.fn() },
    notification: { findFirst: jest.fn() },
  };

  const notificationService = {
    notifyAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationRecipientService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();
    service = moduleRef.get(NotificationRecipientService);
  });

  it('notifies all active doctor and secretary accounts', async () => {
    prisma.account.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    notificationService.notifyAccount.mockResolvedValue(null);

    await service.notifyStaff({
      type: NOTIFICATION_TYPES.APPOINTMENT_PENDING_STAFF,
      titleAr: 'ع',
      titleEn: 'T',
      bodyAr: 'ب',
      bodyEn: 'B',
      data: { appointmentId: 5 },
    });

    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: {
        status: AccountStatus.ACTIVE,
        roles: {
          some: {
            role: { code: { in: ['DOCTOR', 'SECRETARY'] } },
          },
        },
      },
      select: { id: true },
    });
    expect(notificationService.notifyAccount).toHaveBeenCalledTimes(2);
    expect(notificationService.notifyAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 1 }),
    );
    expect(notificationService.notifyAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 2 }),
    );
  });

  it('skips patient notification when account is not linked', async () => {
    prisma.patient.findUnique.mockResolvedValue({ accountId: null });

    await service.notifyPatientByPatientId(3, {
      type: NOTIFICATION_TYPES.INVOICE_CREATED,
      titleAr: 'ع',
      titleEn: 'T',
      bodyAr: 'ب',
      bodyEn: 'B',
    });

    expect(notificationService.notifyAccount).not.toHaveBeenCalled();
  });

  it('detects duplicate notifications by type and data fields', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 99 });

    const duplicate = await service.hasSentNotification(10, NOTIFICATION_TYPES.APPOINTMENT_REMINDER, {
      appointmentId: 7,
      reminderHours: 24,
    });

    expect(duplicate).toBe(true);
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: {
        accountId: 10,
        type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
        AND: [
          { data: { path: ['appointmentId'], equals: 7 } },
          { data: { path: ['reminderHours'], equals: 24 } },
        ],
      },
      select: { id: true },
    });
  });
});
