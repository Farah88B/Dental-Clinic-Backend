import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PatientFormFieldAdapter } from '../adapter/patient-form-field.adapter';
import { PatientFormService } from './patient-form.service';

describe('PatientFormService', () => {
  let service: PatientFormService;
  let prisma: {
    patientFormFieldDefinition: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
    };
    patientFormFieldValue: {
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const rawField = {
    id: 1,
    key: 'allergy_type',
    labelAr: 'نوع الحساسية',
    labelEn: 'Allergy Type',
    type: 'RADIO',
    required: true,
    validation: null,
    options: [
      { value: 'food', labelAr: 'غذائية', labelEn: 'Food', isActive: true },
      { value: 'drug', labelAr: 'دوائية', labelEn: 'Drug', isActive: true },
    ],
    displayOrder: 2,
    isActive: true,
    createdById: 5,
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-01T10:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      patientFormFieldDefinition: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      patientFormFieldValue: {
        count: jest.fn(),
      },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PatientFormService,
        PatientFormFieldAdapter,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(PatientFormService);
  });

  it('list() returns paginated adapted items', async () => {
    prisma.patientFormFieldDefinition.findMany.mockResolvedValue([rawField]);
    prisma.patientFormFieldDefinition.count.mockResolvedValue(1);

    const result = await service.list(
      { page: 1, pageSize: 20, skip: 0, take: 20 } as any,
      { isActive: true, search: 'allergy' },
    );

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 1,
      key: 'allergy_type',
    });
    expect(prisma.patientFormFieldDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      }),
    );
  });

  it('getById() uses findUniqueOrThrow and adapts result', async () => {
    prisma.patientFormFieldDefinition.findUniqueOrThrow.mockResolvedValue(rawField);

    const result = await service.getById(1);

    expect(prisma.patientFormFieldDefinition.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
    expect(result.key).toBe('allergy_type');
  });

  it('create() throws when RADIO/MULTI_SELECT has no options', async () => {
    await expect(
      service.create(
        {
          key: 'blood_type',
          labelAr: 'فصيلة الدم',
          labelEn: 'Blood Type',
          type: 'RADIO' as any,
        },
        10,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() auto-calculates displayOrder when omitted', async () => {
    prisma.patientFormFieldDefinition.findFirst.mockResolvedValue({ displayOrder: 7 });
    prisma.patientFormFieldDefinition.create.mockResolvedValue({ ...rawField, displayOrder: 8 });

    await service.create(
      {
        key: 'smoking_status',
        labelAr: 'حالة التدخين',
        labelEn: 'Smoking Status',
        type: 'TEXT' as any,
      },
      77,
    );

    expect(prisma.patientFormFieldDefinition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayOrder: 8,
          createdById: 77,
        }),
      }),
    );
  });

  it('update() blocks type change when values already exist', async () => {
    prisma.patientFormFieldDefinition.findUniqueOrThrow.mockResolvedValue(rawField);
    prisma.patientFormFieldValue.count.mockResolvedValue(2);

    await expect(service.update(1, { type: 'TEXT' as any })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('update() merges options (reactivate existing, disable removed, add new)', async () => {
    prisma.patientFormFieldDefinition.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      key: 'allergy_type',
      type: 'RADIO',
      options: [
        { value: 'food', labelAr: 'غذائية قديمة', labelEn: 'Old Food', isActive: false },
        { value: 'drug', labelAr: 'دوائية', labelEn: 'Drug', isActive: true },
      ],
    });
    prisma.patientFormFieldDefinition.update.mockResolvedValue(rawField);

    await service.update(1, {
      options: [
        { value: 'food', labelAr: 'غذائية', labelEn: 'Food' },
        { value: 'seasonal', labelAr: 'موسمية', labelEn: 'Seasonal' },
      ],
    } as any);

    expect(prisma.patientFormFieldDefinition.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          options: [
            { value: 'food', labelAr: 'غذائية', labelEn: 'Food', isActive: true },
            { value: 'drug', labelAr: 'دوائية', labelEn: 'Drug', isActive: false },
            { value: 'seasonal', labelAr: 'موسمية', labelEn: 'Seasonal', isActive: true },
          ],
        }),
      }),
    );
  });

  it('toggleStatus() updates only isActive and returns adapted item', async () => {
    prisma.patientFormFieldDefinition.update.mockResolvedValue({ ...rawField, isActive: false });

    const result = await service.toggleStatus(1, { isActive: false });

    expect(prisma.patientFormFieldDefinition.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { isActive: false } }),
    );
    expect(result.isActive).toBe(false);
  });

  it('reorder() throws when duplicate ids are provided', async () => {
    await expect(
      service.reorder({
        fields: [
          { id: 1, displayOrder: 0 },
          { id: 1, displayOrder: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reorder() throws when one or more ids do not exist', async () => {
    prisma.patientFormFieldDefinition.findMany.mockResolvedValue([{ id: 1 }]);

    await expect(
      service.reorder({
        fields: [
          { id: 1, displayOrder: 0 },
          { id: 2, displayOrder: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reorder() updates in a transaction and returns adapted ordered list', async () => {
    prisma.patientFormFieldDefinition.findMany
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
      .mockResolvedValueOnce([
        { ...rawField, id: 1, displayOrder: 0 },
        { ...rawField, id: 2, key: 'medical_history', displayOrder: 1 },
      ]);
    prisma.patientFormFieldDefinition.update
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const result = await service.reorder({
      fields: [
        { id: 1, displayOrder: 0 },
        { id: 2, displayOrder: 1 },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].displayOrder).toBe(0);
  });
});