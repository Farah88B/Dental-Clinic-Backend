import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { AppointmentStatus, TreatmentPlanStatus, TreatmentSessionStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { TreatmentSessionsService } from './treatment-sessions.service';
import { PatientTreatmentService } from './patient-treatment.service';

describe('PatientTreatmentService', () => {
  let service: PatientTreatmentService;
  let prisma: any;
  let treatmentSessionsService: {
    findPendingRatingSummaryForPatient: jest.Mock;
    findPendingRatingForPatient: jest.Mock;
    rateForPatient: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      patient: { findUniqueOrThrow: jest.fn() },
      treatmentPlan: {
        findMany: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      treatmentSession: { findMany: jest.fn() },
      medicalAttachment: { findMany: jest.fn() },
    };

    treatmentSessionsService = {
      findPendingRatingSummaryForPatient: jest.fn(),
      findPendingRatingForPatient: jest.fn(),
      rateForPatient: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PatientTreatmentService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: TreatmentSessionsService,
          useValue: treatmentSessionsService,
        },
      ],
    }).compile();

    service = moduleRef.get(PatientTreatmentService);
  });

  it('listPlans() returns summary with progress and no nested sessions', async () => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 7 });
    prisma.treatmentPlan.findMany.mockResolvedValue([
      {
        id: 1,
        patientId: 7,
        status: 'ACTIVE',
        estimatedCost: new Decimal(100),
        isActive: true,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-02T00:00:00.000Z'),
        template: { nameAr: 'خطة', nameEn: 'Plan' },
        sessions: [
          { status: TreatmentSessionStatus.COMPLETED },
          { status: TreatmentSessionStatus.COMPLETED },
          { status: TreatmentSessionStatus.PENDING },
          { status: TreatmentSessionStatus.CANCELLED },
        ],
      },
    ]);

    const result = await service.listPlans(7, {
      kind: 'patient',
      accountId: 11,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      sessionCount: 3,
      progressPercent: 67,
      estimatedCost: '100',
      name: 'خطة',
    });
    expect(result[0]).not.toHaveProperty('sessions');
    expect(result[0]).not.toHaveProperty('template');
    expect(result[0]).not.toHaveProperty('actualCost');
    expect(result[0]).not.toHaveProperty('createdByAccountId');
  });

  it('listPlans() filters by status when provided', async () => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 7 });
    prisma.treatmentPlan.findMany.mockResolvedValue([]);

    await service.listPlans(
      7,
      { kind: 'staff' },
      undefined,
      TreatmentPlanStatus.ACTIVE,
    );

    expect(prisma.treatmentPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: 7, status: TreatmentPlanStatus.ACTIVE },
      }),
    );
  });

  it('getPlan() embeds pending rating, canBook/canTreat, and omits treatmentPlanId', async () => {
    const canRateUntil = '2026-08-03T12:00:00.000Z';

    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 7 });
    treatmentSessionsService.findPendingRatingSummaryForPatient.mockResolvedValue(
      {
        treatmentSessionId: 2,
        canRateUntil,
      },
    );
    prisma.treatmentPlan.findFirstOrThrow.mockResolvedValue({
      id: 1,
      patientId: 7,
      status: 'ACTIVE',
      estimatedCost: new Decimal(100),
      isActive: true,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
      template: null,
      sessions: [
        {
          id: 2,
          sessionOrder: 1,
          titleAr: 'جلسة',
          titleEn: 'Session',
          status: TreatmentSessionStatus.COMPLETED,
          durationMinutes: 30,
          estimatedCost: new Decimal(40),
          availableForBookingAt: null,
          completedAt: new Date('2026-08-03T09:00:00.000Z'),
          rating: null,
          appointments: [],
          encounter: null,
        },
        {
          id: 3,
          sessionOrder: 2,
          titleAr: 'جلسة 2',
          titleEn: 'Session 2',
          status: TreatmentSessionStatus.PENDING,
          durationMinutes: 30,
          estimatedCost: new Decimal(60),
          availableForBookingAt: null,
          completedAt: null,
          rating: null,
          appointments: [],
          encounter: null,
        },
      ],
    });

    const result = await service.getPlan(7, 1, 11);

    expect(result.sessions[0].pendingRating).toEqual({
      enabled: true,
      canRateUntil,
    });
    expect(result.sessions[0].estimatedCost).toBeNull();
    expect(result.sessions[0].canBook).toBe(false);
    expect(result.sessions[0].canTreat).toBe(false);
    expect(result.sessions[1].estimatedCost).toBe('60');
    expect(result.sessions[1].canBook).toBe(true);
    expect(result.sessions[1].canTreat).toBe(false);
    expect(result.sessions[0]).not.toHaveProperty('treatmentPlanId');
    expect(result.sessions[0]).not.toHaveProperty('actualCost');
  });

  it('listSessions(COMPLETED) embeds pending rating and plan names', async () => {
    const canRateUntil = '2026-08-03T12:00:00.000Z';

    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 7 });
    treatmentSessionsService.findPendingRatingSummaryForPatient.mockResolvedValue(
      {
        treatmentSessionId: 2,
        canRateUntil,
      },
    );
    prisma.treatmentSession.findMany.mockResolvedValue([
      {
        id: 2,
        treatmentPlanId: 1,
        sessionOrder: 1,
        titleAr: 'جلسة',
        titleEn: 'Session',
        status: TreatmentSessionStatus.COMPLETED,
        durationMinutes: 30,
        estimatedCost: new Decimal(40),
        availableForBookingAt: null,
        completedAt: new Date('2026-08-03T09:00:00.000Z'),
        rating: null,
        appointments: [],
        encounter: null,
        treatmentPlan: {
          id: 1,
          template: { nameAr: 'خطة', nameEn: 'Plan' },
          sessions: [
            {
              id: 2,
              sessionOrder: 1,
              status: TreatmentSessionStatus.COMPLETED,
            },
            {
              id: 3,
              sessionOrder: 2,
              status: TreatmentSessionStatus.COMPLETED,
            },
          ],
        },
      },
      {
        id: 3,
        treatmentPlanId: 1,
        sessionOrder: 2,
        titleAr: 'جلسة 2',
        titleEn: 'Session 2',
        status: TreatmentSessionStatus.COMPLETED,
        durationMinutes: 30,
        estimatedCost: new Decimal(60),
        availableForBookingAt: null,
        completedAt: new Date('2026-08-02T09:00:00.000Z'),
        rating: 5,
        appointments: [],
        encounter: null,
        treatmentPlan: {
          id: 1,
          template: { nameAr: 'خطة', nameEn: 'Plan' },
          sessions: [
            {
              id: 2,
              sessionOrder: 1,
              status: TreatmentSessionStatus.COMPLETED,
            },
            {
              id: 3,
              sessionOrder: 2,
              status: TreatmentSessionStatus.COMPLETED,
            },
          ],
        },
      },
    ]);

    const result = await service.listSessions(
      7,
      { kind: 'patient', accountId: 11 },
      TreatmentSessionStatus.COMPLETED,
    );

    expect(result[0].pendingRating).toEqual({
      enabled: true,
      canRateUntil,
    });
    expect(result[1].pendingRating).toBeNull();
    expect(result[0].estimatedCost).toBeNull();
    expect(result[0].planName).toBe('خطة');
    expect(result[0].title).toBe('جلسة');
    expect(result[0]).not.toHaveProperty('actualCost');
  });

  it('listSessionsForBooking() returns PENDING with canBook flags', async () => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 7 });
    const planSessions = [
      { id: 1, sessionOrder: 1, status: TreatmentSessionStatus.COMPLETED },
      { id: 2, sessionOrder: 2, status: TreatmentSessionStatus.COMPLETED },
      { id: 10, sessionOrder: 3, status: TreatmentSessionStatus.PENDING },
      { id: 11, sessionOrder: 4, status: TreatmentSessionStatus.PENDING },
    ];
    prisma.treatmentSession.findMany.mockResolvedValue([
      {
        id: 10,
        treatmentPlanId: 1,
        sessionOrder: 3,
        titleAr: 'قابلة للحجز',
        titleEn: 'Ready',
        status: TreatmentSessionStatus.PENDING,
        durationMinutes: 45,
        estimatedCost: new Decimal(80),
        availableForBookingAt: new Date(),
        completedAt: null,
        rating: null,
        appointments: [],
        encounter: null,
        treatmentPlan: {
          id: 1,
          template: { nameAr: 'خطة', nameEn: 'Plan' },
          sessions: planSessions,
        },
      },
      {
        id: 11,
        treatmentPlanId: 1,
        sessionOrder: 4,
        titleAr: 'معلقة',
        titleEn: 'Pending',
        status: TreatmentSessionStatus.PENDING,
        durationMinutes: 30,
        estimatedCost: new Decimal(50),
        availableForBookingAt: new Date(),
        completedAt: null,
        rating: null,
        appointments: [],
        encounter: null,
        treatmentPlan: {
          id: 1,
          template: null,
          sessions: planSessions,
        },
      },
    ]);

    const result = await service.listSessionsForBooking(7, {
      kind: 'patient',
      accountId: 11,
    });

    expect(prisma.treatmentSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TreatmentSessionStatus.PENDING,
        }),
      }),
    );
    expect(result).toHaveLength(2);
    expect(result[0].estimatedCost).toBe('80');
    expect(result[0].canBook).toBe(true);
    expect(result[0].canTreat).toBe(false);
    expect(result[0].planName).toBe('خطة');
    expect(result[1].canBook).toBe(false);
    expect(result[1].planName).toBeNull();
  });

  it('canTreat is true for BOOKED + CONFIRMED appointment', async () => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 7 });
    prisma.treatmentSession.findMany.mockResolvedValue([
      {
        id: 20,
        treatmentPlanId: 1,
        sessionOrder: 5,
        titleAr: 'محجوزة',
        titleEn: 'Booked',
        status: TreatmentSessionStatus.BOOKED,
        durationMinutes: 30,
        estimatedCost: new Decimal(40),
        availableForBookingAt: new Date(),
        completedAt: null,
        rating: null,
        appointments: [
          {
            id: 99,
            status: AppointmentStatus.CONFIRMED,
            createdAt: new Date(),
          },
        ],
        encounter: null,
        treatmentPlan: {
          id: 1,
          template: null,
          sessions: [
            {
              id: 20,
              sessionOrder: 5,
              status: TreatmentSessionStatus.BOOKED,
            },
          ],
        },
      },
    ]);

    const result = await service.listSessions(
      7,
      { kind: 'patient', accountId: 11 },
      TreatmentSessionStatus.BOOKED,
    );

    expect(result[0].canBook).toBe(false);
    expect(result[0].canTreat).toBe(true);
    expect(result[0].estimatedCost).toBe('40');
  });
});
