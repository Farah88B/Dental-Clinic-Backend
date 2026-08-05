import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { TreatmentSessionTemplatesService } from './treatment-session-templates.service';
import { TreatmentPlanTemplatesService } from './treatment-plan-templates.service';
import { TreatmentSessionTemplateAdapter } from '../adapter/treatment-session-template.adapter';
import { TreatmentPlanTemplateAdapter } from '../adapter/treatment-plan-template.adapter';
import { PrismaService } from 'src/common/prisma/services/prisma.service';

describe('TreatmentSessionTemplatesService', () => {
  let service: TreatmentSessionTemplatesService;
  let planTemplatesService: { recalculateCost: jest.Mock };
  let prisma: {
    treatmentPlanTemplate: { findUniqueOrThrow: jest.Mock };
    treatmentSessionTemplate: {
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tx: {
    treatmentSessionTemplate: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
    };
    treatmentPlanTemplate: { update: jest.Mock };
  };

  const rawSession = {
    id: 10,
    planTemplateId: 1,
    titleAr: 'جلسة تنظيف',
    titleEn: 'Cleaning Session',
    sessionOrder: 1,
    durationMinutes: 45,
    minDaysBeforeBooking: 0,
    estimatedCost: new Decimal(50000),
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    tx = {
      treatmentSessionTemplate: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      treatmentPlanTemplate: {
        update: jest.fn(),
      },
    };

    prisma = {
      treatmentPlanTemplate: { findUniqueOrThrow: jest.fn() },
      treatmentSessionTemplate: {
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    planTemplatesService = {
      recalculateCost: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TreatmentSessionTemplatesService,
        TreatmentSessionTemplateAdapter,
        TreatmentPlanTemplateAdapter,
        { provide: TreatmentPlanTemplatesService, useValue: planTemplatesService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(TreatmentSessionTemplatesService);
  });

  it('listForPlan() returns only active session templates', async () => {
    prisma.treatmentPlanTemplate.findUniqueOrThrow.mockResolvedValue({ id: 1 });
    prisma.treatmentSessionTemplate.findMany.mockResolvedValue([rawSession]);

    const result = await service.listForPlan(1);

    expect(prisma.treatmentSessionTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planTemplateId: 1, isActive: true },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
  });

  it('create() recalculates plan cost inside the same transaction', async () => {
    prisma.treatmentPlanTemplate.findUniqueOrThrow.mockResolvedValue({ id: 1 });
    tx.treatmentSessionTemplate.create.mockResolvedValue(rawSession);

    const result = await service.create(1, {
      titleAr: 'جلسة تنظيف',
      titleEn: 'Cleaning Session',
      sessionOrder: 1,
      durationMinutes: 45,
      minDaysBeforeBooking: 0,
      estimatedCost: 50000,
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(planTemplatesService.recalculateCost).toHaveBeenCalledWith(1, tx);
    expect(result.estimatedCost).toBe('50000');
    expect(result.isActive).toBe(true);
  });

  it('update() recalculates plan cost inside the same transaction', async () => {
    prisma.treatmentSessionTemplate.findUniqueOrThrow.mockResolvedValue({
      planTemplateId: 1,
    });
    tx.treatmentSessionTemplate.update.mockResolvedValue({
      ...rawSession,
      estimatedCost: new Decimal(80000),
    });

    await service.update(10, { estimatedCost: 80000 });

    expect(planTemplatesService.recalculateCost).toHaveBeenCalledWith(1, tx);
  });

  it('delete() soft-deletes via isActive=false then recalculates cost', async () => {
    prisma.treatmentSessionTemplate.findUniqueOrThrow.mockResolvedValue({
      planTemplateId: 1,
    });
    tx.treatmentSessionTemplate.update.mockResolvedValue({
      ...rawSession,
      isActive: false,
    });

    await service.delete(10);

    expect(tx.treatmentSessionTemplate.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { isActive: false },
    });
    expect(tx.treatmentSessionTemplate.delete).not.toHaveBeenCalled();
    expect(planTemplatesService.recalculateCost).toHaveBeenCalledWith(1, tx);
  });

  it('create() lets a Prisma unique-constraint error (P2002) propagate unhandled', async () => {
    prisma.treatmentPlanTemplate.findUniqueOrThrow.mockResolvedValue({ id: 1 });
    const uniqueError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    tx.treatmentSessionTemplate.create.mockRejectedValue(uniqueError);

    await expect(
      service.create(1, {
        titleAr: 'جلسة مكررة',
        titleEn: 'Duplicate Session',
        sessionOrder: 1,
        estimatedCost: 0,
      }),
    ).rejects.toBe(uniqueError);
    // Intentionally NOT catching/wrapping — @@unique([planTemplateId, sessionOrder])
    // raises P2002 and PrismaExceptionFilter maps it to 409.
  });
});
