import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AppointmentStatus,
  EncounterStatus,
  TreatmentSessionStatus,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { TreatmentSessionsService } from './treatment-sessions.service';
import { TreatmentSessionAdapter } from '../adapter/treatment-session.adapter';
import { TreatmentPlansService } from 'src/modules/treatment-plans/services/treatment-plans.service';
import { EncounterAdapter } from 'src/modules/encounters/adapter/encounter.adapter';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { TREATMENT_CONSTANTS, TREATMENT_ERROR_CODES } from 'src/common/constants/treatment.constants';

describe('TreatmentSessionsService', () => {
  let service: TreatmentSessionsService;
  let prisma: any;
  let tx: any;
  let planService: { recalculateCost: jest.Mock };

  const baseSession = {
    id: 10,
    treatmentPlanId: 1,
    titleAr: 'استشارة',
    titleEn: 'Consultation',
    sessionOrder: 1,
    durationMinutes: 30,
    minDaysBeforeBooking: 0,
    estimatedCost: new Decimal(0),
    actualCost: null,
    availableForBookingAt: new Date(),
    status: TreatmentSessionStatus.BOOKED,
    completedAt: null,
    rating: null,
    ratedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const emptyTeeth = Array.from({ length: 48 }, (_, i) => ({
    index: i + 1,
    value: null,
  }));

  const baseEncounter = {
    id: 1,
    treatmentSessionId: 10,
    appointmentId: 55,
    status: EncounterStatus.IN_TREATMENT,
    diagnosis: null,
    clinicalNotes: null,
    teeth: emptyTeeth,
    prescription: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    attachments: [],
  };

  beforeEach(async () => {
    tx = {
      treatmentSession: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      encounter: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      appointment: { updateMany: jest.fn() },
    };

    prisma = {
      treatmentPlan: { findUniqueOrThrow: jest.fn() },
      treatmentSession: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      appointment: { findFirst: jest.fn() },
      clinicSettings: {
        findFirstOrThrow: jest.fn().mockResolvedValue({ ratingValidityHours: 5 }),
      },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    planService = { recalculateCost: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TreatmentSessionsService,
        TreatmentSessionAdapter,
        EncounterAdapter,
        { provide: TreatmentPlansService, useValue: planService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(TreatmentSessionsService);
  });

  it('start() moves session to IN_TREATMENT, syncs appointments, and returns encounter + nextSession', async () => {
    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue(baseSession);
    prisma.appointment.findFirst.mockResolvedValue({
      id: 55,
      status: AppointmentStatus.CONFIRMED,
    });
    tx.encounter.create.mockResolvedValue(baseEncounter);
    prisma.treatmentSession.findFirst.mockResolvedValue({
      id: 11,
      sessionOrder: 2,
      titleAr: 'تنظيف',
      titleEn: 'Cleaning',
      durationMinutes: 45,
      estimatedCost: new Decimal(50000),
      minDaysBeforeBooking: 7,
      availableForBookingAt: null,
    });

    const result = await service.start(10);

    expect(tx.treatmentSession.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: TreatmentSessionStatus.IN_TREATMENT },
    });
    expect(tx.appointment.updateMany).toHaveBeenCalledWith({
      where: {
        treatmentSessionId: 10,
        status: {
          in: [
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.IN_TREATMENT,
          ],
        },
      },
      data: { status: AppointmentStatus.IN_TREATMENT },
    });
    expect(result.encounter.teeth).toHaveLength(TREATMENT_CONSTANTS.TEETH_COUNT);
    expect(result.encounter.status).toBe(EncounterStatus.IN_TREATMENT);
    expect(result.nextSession).toMatchObject({
      id: 11,
      sessionOrder: 2,
      title: 'تنظيف',
      durationMinutes: 45,
      estimatedCost: '50000',
      minDaysBeforeBooking: 7,
    });
    expect(result.nextSession?.suggestedBookingDate).toBeInstanceOf(Date);
  });

  it('start() reuses existing encounter (idempotent)', async () => {
    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue(baseSession);
    prisma.appointment.findFirst.mockResolvedValue({
      id: 55,
      status: AppointmentStatus.CONFIRMED,
    });
    tx.encounter.findUnique.mockResolvedValue(baseEncounter);
    prisma.treatmentSession.findFirst.mockResolvedValue(null);

    const result = await service.start(10);

    expect(tx.encounter.create).not.toHaveBeenCalled();
    expect(result.encounter.id).toBe(1);
    expect(result.nextSession).toBeNull();
  });

  it('start() rejects sessions that are not BOOKED', async () => {
    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue({
      ...baseSession,
      status: TreatmentSessionStatus.PENDING,
    });

    await expect(service.start(10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('start() rejects BOOKED sessions without canTreat appointment', async () => {
    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue(baseSession);
    prisma.appointment.findFirst.mockResolvedValue({
      id: 55,
      status: AppointmentStatus.PENDING_CONFIRMATION,
    });

    await expect(service.start(10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('complete() sets COMPLETED, writes clinical fields, and schedules next session', async () => {
    prisma.treatmentSession.findUniqueOrThrow
      .mockResolvedValueOnce({
        ...baseSession,
        status: TreatmentSessionStatus.IN_TREATMENT,
      })
      .mockResolvedValueOnce({
        ...baseSession,
        status: TreatmentSessionStatus.COMPLETED,
        completedAt: new Date(),
        actualCost: new Decimal(75000),
      });

    tx.treatmentSession.findFirst.mockResolvedValue({
      id: 11,
      minDaysBeforeBooking: 7,
      sessionOrder: 2,
    });

    await service.complete(10, {
      diagnosis: 'Caries',
      clinicalNotes: 'Notes',
      prescription: 'Rx',
      actualCost: 75000,
      nextMinDaysBeforeBooking: 7,
    });

    expect(tx.treatmentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          status: TreatmentSessionStatus.COMPLETED,
          actualCost: 75000,
        }),
      }),
    );
    expect(tx.encounter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { treatmentSessionId: 10 },
        data: expect.objectContaining({
          status: EncounterStatus.COMPLETED,
          diagnosis: 'Caries',
          clinicalNotes: 'Notes',
          prescription: 'Rx',
        }),
      }),
    );
    expect(tx.appointment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { treatmentSessionId: 10 },
        data: expect.objectContaining({
          status: AppointmentStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      }),
    );
    expect(tx.treatmentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          availableForBookingAt: expect.any(Date),
        }),
      }),
    );
  });

  it('cancel() sets CANCELLED and cancels linked appointments', async () => {
    prisma.treatmentSession.findUniqueOrThrow
      .mockResolvedValueOnce({
        ...baseSession,
        status: TreatmentSessionStatus.BOOKED,
      })
      .mockResolvedValueOnce({
        ...baseSession,
        status: TreatmentSessionStatus.CANCELLED,
      });

    await service.cancel(10);

    expect(tx.treatmentSession.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: TreatmentSessionStatus.CANCELLED },
    });
    expect(tx.appointment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { treatmentSessionId: 10 },
        data: expect.objectContaining({
          status: AppointmentStatus.CANCELLED,
          cancelledAt: expect.any(Date),
        }),
      }),
    );
  });

  it('cancel() rejects IN_TREATMENT sessions', async () => {
    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue({
      ...baseSession,
      status: TreatmentSessionStatus.IN_TREATMENT,
    });

    await expect(service.cancel(10)).rejects.toThrow(
      TREATMENT_ERROR_CODES.SESSION_NOT_CANCELLABLE,
    );
  });

  it('update() rejects COMPLETED / IN_TREATMENT / CANCELLED', async () => {
    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue({
      treatmentPlanId: 1,
      status: TreatmentSessionStatus.COMPLETED,
    });

    await expect(service.update(10, { titleEn: 'X' })).rejects.toThrow(
      TREATMENT_ERROR_CODES.SESSION_NOT_UPDATABLE,
    );
  });

  it('rate() rejects after rating window expires', async () => {
    const completedAt = new Date();
    completedAt.setHours(completedAt.getHours() - 6);

    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue({
      ...baseSession,
      status: TreatmentSessionStatus.COMPLETED,
      completedAt,
      rating: null,
    });

    await expect(service.rate(10, { rating: 5 })).rejects.toThrow(
      TREATMENT_ERROR_CODES.RATING_WINDOW_EXPIRED,
    );
  });

  it('findPendingRatingForPatient() returns latest unrated completed session inside window', async () => {
    const completedAt = new Date();
    const rawSession = {
      ...baseSession,
      id: 22,
      completedAt,
      rating: null,
      status: TreatmentSessionStatus.COMPLETED,
    };
    prisma.treatmentSession.findFirst.mockResolvedValue(rawSession);

    const result = await service.findPendingRatingForPatient(4);

    expect(prisma.treatmentSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TreatmentSessionStatus.COMPLETED,
          rating: null,
          treatmentPlan: { patientId: 4 },
        }),
        orderBy: { completedAt: 'desc' },
      }),
    );
    expect(result?.treatmentSessionId).toBe(22);
    expect(result?.completedAt).toBe(completedAt.toISOString());
    expect(result?.canRateUntil).toBeDefined();
    expect(result?.session.id).toBe(22);
  });

  it('findPendingRatingForPatient() skips already-rated sessions via query filter', async () => {
    prisma.treatmentSession.findFirst.mockResolvedValue(null);

    const result = await service.findPendingRatingForPatient(4);

    expect(result).toBeNull();
  });
});
