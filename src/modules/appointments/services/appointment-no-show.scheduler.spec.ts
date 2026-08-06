import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppointmentStatus, TreatmentSessionStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import {
  clinicLocalToUtc,
  getClinicTodayDateOnly,
} from 'src/modules/clinic-schedule/helpers/clinic-timezone.helper';
import { AppointmentNoShowScheduler } from './appointment-no-show.scheduler';

describe('AppointmentNoShowScheduler', () => {
  let scheduler: AppointmentNoShowScheduler;

  const prisma = {
    appointment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    treatmentSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const timeZone = 'Asia/Damascus';

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppointmentNoShowScheduler,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'clinic.timezone' ? timeZone : undefined,
            ),
          },
        },
      ],
    }).compile();

    scheduler = moduleRef.get(AppointmentNoShowScheduler);
  });

  function clinicTodayStart(): Date {
    const today = getClinicTodayDateOnly(timeZone);
    return clinicLocalToUtc(
      today.getUTCFullYear(),
      today.getUTCMonth() + 1,
      today.getUTCDate(),
      0,
      timeZone,
    );
  }

  it('marks past CONFIRMED appointment as NO_SHOW and reverts BOOKED session', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      { id: 10, treatmentSessionId: 55 },
    ]);
    prisma.treatmentSession.findUnique.mockResolvedValue({
      id: 55,
      status: TreatmentSessionStatus.BOOKED,
    });

    const count = await scheduler.markPastAppointmentsAsNoShow();

    expect(count).toBe(1);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [
              AppointmentStatus.PENDING_CONFIRMATION,
              AppointmentStatus.CONFIRMED,
            ],
          },
          scheduledAt: { lt: clinicTodayStart() },
        }),
      }),
    );
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: AppointmentStatus.NO_SHOW },
    });
    expect(prisma.treatmentSession.update).toHaveBeenCalledWith({
      where: { id: 55 },
      data: { status: TreatmentSessionStatus.PENDING },
    });
  });

  it('does not change a session that is already PENDING', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      { id: 11, treatmentSessionId: 56 },
    ]);
    prisma.treatmentSession.findUnique.mockResolvedValue({
      id: 56,
      status: TreatmentSessionStatus.PENDING,
    });

    await scheduler.markPastAppointmentsAsNoShow();

    expect(prisma.appointment.update).toHaveBeenCalled();
    expect(prisma.treatmentSession.update).not.toHaveBeenCalled();
  });

  it('returns 0 when there are no candidates', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);

    const count = await scheduler.markPastAppointmentsAsNoShow();

    expect(count).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('handles appointments without a treatment session', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      { id: 12, treatmentSessionId: null },
    ]);

    await scheduler.markPastAppointmentsAsNoShow();

    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { status: AppointmentStatus.NO_SHOW },
    });
    expect(prisma.treatmentSession.findUnique).not.toHaveBeenCalled();
  });
});
