import { Test } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { TreatmentPlanTemplatesService } from './treatment-plan-templates.service';
import { TreatmentPlanTemplateAdapter } from '../adapter/treatment-plan-template.adapter';
import { TreatmentSessionTemplateAdapter } from '../adapter/treatment-session-template.adapter';
import { PrismaService } from 'src/common/prisma/services/prisma.service';

describe('TreatmentPlanTemplatesService', () => {
  let service: TreatmentPlanTemplatesService;
  let prisma: {
    treatmentPlanTemplate: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    treatmentSessionTemplate: {
      aggregate: jest.Mock;
    };
  };

  const rawTemplate = {
    id: 1,
    nameAr: 'علاج عصب',
    nameEn: 'Root Canal',
    estimatedCost: new Decimal(0),
    createdByAccountId: 5,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    sessionTemplates: [],
  };

  beforeEach(async () => {
    prisma = {
      treatmentPlanTemplate: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      treatmentSessionTemplate: {
        aggregate: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TreatmentPlanTemplatesService,
        TreatmentPlanTemplateAdapter,
        TreatmentSessionTemplateAdapter,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(TreatmentPlanTemplatesService);
  });

  it('create() starts estimatedCost at 0 when no nested sessions', async () => {
    prisma.treatmentPlanTemplate.create.mockResolvedValue(rawTemplate);

    const result = await service.create(
      { nameAr: 'علاج عصب', nameEn: 'Root Canal' },
      5,
    );

    expect(prisma.treatmentPlanTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nameAr: 'علاج عصب',
          nameEn: 'Root Canal',
          createdByAccountId: 5,
          estimatedCost: 0,
        }),
      }),
    );
    expect(result.estimatedCost).toBe('0');
    expect(result.sessionCount).toBe(0);
  });

  it('create() with nested sessions persists them and sums estimatedCost', async () => {
    prisma.treatmentPlanTemplate.create.mockResolvedValue({
      ...rawTemplate,
      estimatedCost: new Decimal(50000),
      sessionTemplates: [
        {
          id: 1,
          planTemplateId: 1,
          titleAr: 'زيارة أولى (استشارة)',
          titleEn: 'First Visit (Consultation)',
          sessionOrder: 1,
          durationMinutes: null,
          minDaysBeforeBooking: 0,
          estimatedCost: new Decimal(0),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          planTemplateId: 1,
          titleAr: 'جلسة',
          titleEn: 'Session',
          sessionOrder: 2,
          durationMinutes: 45,
          minDaysBeforeBooking: 7,
          estimatedCost: new Decimal(50000),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    await service.create(
      {
        nameAr: 'علاج عصب',
        nameEn: 'Root Canal',
        sessions: [
          {
            titleAr: 'جلسة',
            titleEn: 'Session',
            sessionOrder: 2,
            durationMinutes: 45,
            minDaysBeforeBooking: 7,
            estimatedCost: 50000,
          },
        ],
      },
      5,
    );

    const data = prisma.treatmentPlanTemplate.create.mock.calls[0][0].data;
    expect(data.estimatedCost).toBe(50000);
    expect(data.sessionTemplates.create).toHaveLength(2);
    expect(data.sessionTemplates.create[0].sessionOrder).toBe(1);
  });

  it('update() allows estimatedCost', async () => {
    prisma.treatmentPlanTemplate.update.mockResolvedValue({
      ...rawTemplate,
      estimatedCost: new Decimal(120000),
    });

    const result = await service.update(1, { estimatedCost: 120000 });

    expect(prisma.treatmentPlanTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ estimatedCost: 120000 }),
      }),
    );
    expect(result.estimatedCost).toBe('120000');
  });

  it('archive() soft-deletes via isActive=false only — never hard-deletes', async () => {
    prisma.treatmentPlanTemplate.update.mockResolvedValue({
      ...rawTemplate,
      isActive: false,
    });

    const result = await service.archive(1);

    expect(prisma.treatmentPlanTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { isActive: false },
      }),
    );
    expect(prisma.treatmentPlanTemplate.delete).not.toHaveBeenCalled();
    expect(result.isActive).toBe(false);
  });

  it('recalculateCost() sums only active session costs via the given tx', async () => {
    const tx = {
      treatmentSessionTemplate: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { estimatedCost: new Decimal(175000) },
        }),
      },
      treatmentPlanTemplate: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    await service.recalculateCost(1, tx as any);

    expect(tx.treatmentSessionTemplate.aggregate).toHaveBeenCalledWith({
      where: { planTemplateId: 1, isActive: true },
      _sum: { estimatedCost: true },
    });
    expect(tx.treatmentPlanTemplate.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estimatedCost: new Decimal(175000) },
    });
  });
});
