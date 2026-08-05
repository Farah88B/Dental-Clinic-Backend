import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AppointmentStatus,
  TreatmentPlanStatus,
  TreatmentSessionStatus,
} from '@prisma/client';
import { TreatmentPlansService } from './treatment-plans.service';
import { TreatmentPlanAdapter } from '../adapter/treatment-plan.adapter';
import { TreatmentSessionAdapter } from 'src/modules/treatment-sessions/adapter/treatment-session.adapter';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { TREATMENT_ERROR_CODES } from 'src/common/constants/treatment.constants';

describe('TreatmentPlansService', () => {
  let service: TreatmentPlansService;
  let prisma: any;
  let tx: any;

  beforeEach(async () => {
    tx = {
      treatmentPlan: {
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      appointment: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      treatmentSession: {
        aggregate: jest.fn(),
        update: jest.fn(),
      },
    };

    prisma = {
      patient: { findUniqueOrThrow: jest.fn() },
      clinicSettings: {
        findFirstOrThrow: jest.fn().mockResolvedValue({
          defaultConsultationDurationMinutes: 30,
        }),
      },
      treatmentPlan: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      treatmentPlanTemplate: { findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TreatmentPlansService,
        TreatmentPlanAdapter,
        TreatmentSessionAdapter,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(TreatmentPlansService);
  });

  it('create without templateId starts with consultation session #1 PENDING', async () => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 10 });

    const createdPlan = {
      id: 1,
      patientId: 10,
      createdByAccountId: 5,
      templateId: null,
      status: TreatmentPlanStatus.ACTIVE,
      estimatedCost: new Decimal(0),
      actualCost: new Decimal(0),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      sessions: [
        {
          id: 100,
          treatmentPlanId: 1,
          titleAr: 'زيارة أولى (استشارة)',
          titleEn: 'First Visit (Consultation)',
          sessionOrder: 1,
          durationMinutes: 30,
          minDaysBeforeBooking: 0,
          estimatedCost: new Decimal(0),
          actualCost: null,
          availableForBookingAt: new Date(),
          status: TreatmentSessionStatus.PENDING,
          completedAt: null,
          rating: null,
          ratedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    tx.treatmentPlan.create.mockResolvedValue(createdPlan);
    tx.treatmentPlan.findUniqueOrThrow.mockResolvedValue(createdPlan);

    const result = await service.create(
      { patientId: 10, nameAr: 'خطة يدوية', nameEn: 'Manual plan' },
      5,
    );

    expect(tx.treatmentPlan.create).toHaveBeenCalled();
    expect(result.sessions[0].sessionOrder).toBe(1);
    expect(result.sessions[0].status).toBe(TreatmentSessionStatus.PENDING);
    expect(result.sessions[0].durationMinutes).toBe(30);
    expect(result.progressPercent).toBe(0);
    expect(result.completedSessions).toBe(0);
    expect(result.totalSessions).toBe(1);
  });

  it('create with appointmentId links Session #1 and books when appointment is CONFIRMED', async () => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 10 });

    const createdPlan = {
      id: 1,
      patientId: 10,
      createdByAccountId: 5,
      templateId: null,
      status: TreatmentPlanStatus.ACTIVE,
      estimatedCost: new Decimal(0),
      actualCost: new Decimal(0),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      sessions: [
        {
          id: 100,
          treatmentPlanId: 1,
          titleAr: 'زيارة أولى (استشارة)',
          titleEn: 'First Visit (Consultation)',
          sessionOrder: 1,
          durationMinutes: 30,
          minDaysBeforeBooking: 0,
          estimatedCost: new Decimal(0),
          actualCost: null,
          availableForBookingAt: new Date(),
          status: TreatmentSessionStatus.PENDING,
          completedAt: null,
          rating: null,
          ratedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const bookedPlan = {
      ...createdPlan,
      sessions: [
        {
          ...createdPlan.sessions[0],
          status: TreatmentSessionStatus.BOOKED,
        },
      ],
    };

    tx.treatmentPlan.create.mockResolvedValue(createdPlan);
    tx.treatmentPlan.findUniqueOrThrow.mockResolvedValue(bookedPlan);
    tx.appointment.findUniqueOrThrow.mockResolvedValue({
      id: 55,
      patientId: 10,
      status: AppointmentStatus.CONFIRMED,
    });

    await service.create(
      { patientId: 10, appointmentId: 55, nameAr: 'خطة يدوية', nameEn: 'Manual plan' },
      5,
    );

    expect(tx.appointment.update).toHaveBeenCalledWith({
      where: { id: 55 },
      data: { treatmentSessionId: 100 },
    });
    expect(tx.treatmentSession.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: { status: TreatmentSessionStatus.BOOKED },
    });
  });

  it('create with appointmentId links but does not book when appointment is PENDING_CONFIRMATION', async () => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ id: 10 });

    const createdPlan = {
      id: 1,
      patientId: 10,
      createdByAccountId: 5,
      templateId: null,
      status: TreatmentPlanStatus.ACTIVE,
      estimatedCost: new Decimal(0),
      actualCost: new Decimal(0),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      sessions: [
        {
          id: 100,
          treatmentPlanId: 1,
          titleAr: 'زيارة أولى (استشارة)',
          titleEn: 'First Visit (Consultation)',
          sessionOrder: 1,
          durationMinutes: 30,
          minDaysBeforeBooking: 0,
          estimatedCost: new Decimal(0),
          actualCost: null,
          availableForBookingAt: new Date(),
          status: TreatmentSessionStatus.PENDING,
          completedAt: null,
          rating: null,
          ratedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    tx.treatmentPlan.create.mockResolvedValue(createdPlan);
    tx.treatmentPlan.findUniqueOrThrow.mockResolvedValue(createdPlan);
    tx.appointment.findUniqueOrThrow.mockResolvedValue({
      id: 55,
      patientId: 10,
      status: AppointmentStatus.PENDING_CONFIRMATION,
    });

    await service.create(
      { patientId: 10, appointmentId: 55, nameAr: 'خطة يدوية', nameEn: 'Manual plan' },
      5,
    );

    expect(tx.appointment.update).toHaveBeenCalledWith({
      where: { id: 55 },
      data: { treatmentSessionId: 100 },
    });
    expect(tx.treatmentSession.update).not.toHaveBeenCalled();
  });

  it('update() allows CANCELLED status only', async () => {
    prisma.treatmentPlan.update.mockResolvedValue({
      id: 1,
      patientId: 10,
      createdByAccountId: 5,
      templateId: null,
      status: TreatmentPlanStatus.CANCELLED,
      estimatedCost: new Decimal(0),
      actualCost: new Decimal(0),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      sessions: [],
    });

    const result = await service.update(1, { status: TreatmentPlanStatus.CANCELLED });

    expect(prisma.treatmentPlan.update).toHaveBeenCalled();
    expect(result.status).toBe(TreatmentPlanStatus.CANCELLED);
  });

  it('update() rejects non-CANCELLED status', async () => {
    await expect(
      service.update(1, { status: TreatmentPlanStatus.ACTIVE }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.update(1, { status: TreatmentPlanStatus.COMPLETED }),
    ).rejects.toThrow(TREATMENT_ERROR_CODES.PLAN_STATUS_MUST_BE_CANCELLED);

    expect(prisma.treatmentPlan.update).not.toHaveBeenCalled();
  });

  it('archive() soft-deletes via isActive=false and CANCELLED status', async () => {
    prisma.treatmentPlan.update.mockResolvedValue({
      id: 1,
      patientId: 10,
      createdByAccountId: 5,
      templateId: null,
      status: TreatmentPlanStatus.CANCELLED,
      estimatedCost: new Decimal(0),
      actualCost: new Decimal(0),
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      sessions: [],
    });

    const result = await service.archive(1);

    expect(prisma.treatmentPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false, status: TreatmentPlanStatus.CANCELLED },
      }),
    );
    expect(result.isActive).toBe(false);
  });
});
