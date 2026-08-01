import { Test } from '@nestjs/testing';
import { PatientAdapter } from '../adapter/patient.adapter';
import { PatientFormSchemaAdapter } from '../adapter/patient-form-schema.adapter';
import { MedicalRecordNumberService } from './medical-record-number.service';
import { PatientFormValidationService } from './patient-form-validation.service';
import { PatientService } from './patient.service';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';

describe('PatientService', () => {
  let service: PatientService;

  const activeDefinition = {
    id: 1,
    key: 'chronic_diseases',
    labelAr: 'الأمراض المزمنة',
    labelEn: 'Chronic Diseases',
    type: 'MULTI_SELECT',
    required: true,
    validation: { minItems: 1 },
    options: [
      {
        value: 'diabetes',
        labelAr: 'سكري',
        labelEn: 'Diabetes',
        isActive: true,
      },
      { value: 'asthma', labelAr: 'ربو', labelEn: 'Asthma', isActive: false },
    ],
    displayOrder: 1,
    isActive: true,
  };

  const prisma = {
    patient: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patientFormFieldDefinition: {
      findMany: jest.fn(),
    },
    patientFormFieldValue: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const medicalRecordNumberService = {
    generate: jest.fn(),
  };
  const appContext = {
    source: 'APP' as const,
    accountId: 5,
    authenticatedAccountId: 5,
    allowDuplicateCreation: false,
  };

  beforeEach(async () => {
    prisma.$transaction.mockImplementation((callback) => callback(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        PatientService,
        PatientAdapter,
        PatientFormSchemaAdapter,
        PatientFormValidationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: MedicalRecordNumberService,
          useValue: medicalRecordNumberService,
        },
      ],
    }).compile();

    service = moduleRef.get(PatientService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    medicalRecordNumberService.generate.mockResolvedValue('MRN000001');
  });

  it('projects the active schema into the authenticated language', async () => {
    prisma.patientFormFieldDefinition.findMany.mockResolvedValue([
      activeDefinition,
    ]);

    const result = await service.getFormSchema('en');

    expect(result).toEqual([
      expect.objectContaining({
        key: 'chronic_diseases',
        label: 'Chronic Diseases',
        options: [{ value: 'diabetes', label: 'Diabetes' }],
      }),
    ]);
    expect(prisma.patientFormFieldDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  it('does not create a patient when a similar patient already exists', async () => {
    prisma.patientFormFieldDefinition.findMany.mockResolvedValue([
      activeDefinition,
    ]);
    prisma.patient.findMany.mockResolvedValue([{ id: 9 }]);

    await expect(
      service.create(
        {
          fullName: 'Ahmad Al-Hassan',
          birthDate: new Date('1990-01-31'),
          gender: 'MALE',
          formValues: [{ key: 'chronic_diseases', value: ['diabetes'] }],
        },
        appContext,
      ),
    ).rejects.toMatchObject({
      response: { message: ERROR_CODES.PATIENT_DUPLICATE },
    });

    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown dynamic field key', async () => {
    prisma.patientFormFieldDefinition.findMany.mockResolvedValue([
      activeDefinition,
    ]);

    await expect(
      service.create(
        {
          fullName: 'Ahmad Al-Hassan',
          birthDate: new Date('1990-01-31'),
          gender: 'MALE',
          formValues: [{ key: 'unknown_field', value: 'value' }],
        },
        appContext,
      ),
    ).rejects.toMatchObject({
      response: { message: ERROR_CODES.PATIENT_FORM_UNKNOWN_FIELD },
    });
  });

  it('rejects inactive options', async () => {
    prisma.patientFormFieldDefinition.findMany.mockResolvedValue([
      activeDefinition,
    ]);

    await expect(
      service.create(
        {
          fullName: 'Ahmad Al-Hassan',
          birthDate: new Date('1990-01-31'),
          gender: 'MALE',
          formValues: [{ key: 'chronic_diseases', value: ['asthma'] }],
        },
        appContext,
      ),
    ).rejects.toMatchObject({
      response: { message: ERROR_CODES.PATIENT_FORM_INACTIVE_OPTION },
    });
  });

  it('creates the patient and dynamic values in one transaction', async () => {
    prisma.patientFormFieldDefinition.findMany.mockResolvedValue([
      activeDefinition,
    ]);
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.create.mockResolvedValue({
      id: 7,
      medicalRecordNumber: 'MRN-TEST',
      fullName: 'Ahmad Al-Hassan',
      birthDate: new Date('1990-01-31'),
      gender: 'MALE',
      status: 'ACTIVE',
      formValues: [
        { value: ['diabetes'], fieldDefinition: { key: 'chronic_diseases' } },
      ],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });

    const result = await service.create(
      {
        fullName: 'Ahmad Al-Hassan',
        birthDate: new Date('1990-01-31'),
        gender: 'MALE',
        formValues: [{ key: 'chronic_diseases', value: ['diabetes'] }],
      },
      appContext,
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: 5,
          createdById: 5,
          status: 'ACTIVE',
          formValues: {
            create: [
              {
                fieldDefinitionId: 1,
                value: ['diabetes'],
                updatedByAccountId: 5,
              },
            ],
          },
        }),
      }),
    );
    expect(medicalRecordNumberService.generate).toHaveBeenCalledWith(prisma);
    expect(result.formValues).toEqual([
      { key: 'chronic_diseases', value: ['diabetes'] },
    ]);
  });

  it('replaces all dynamic form values on update', async () => {
    prisma.patient.findUniqueOrThrow
      .mockResolvedValueOnce({
        id: 7,
        status: 'ACTIVE',
        accountId: 5,
      })
      .mockResolvedValueOnce({
        id: 7,
        medicalRecordNumber: 'MRN000001',
        fullName: 'Ahmad Al-Hassan',
        birthDate: new Date('1990-01-31'),
        gender: 'MALE',
        status: 'ACTIVE',
        formValues: [
          {
            value: ['diabetes'],
            fieldDefinition: { key: 'chronic_diseases' },
          },
        ],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      });
    prisma.patientFormFieldDefinition.findMany.mockResolvedValue([
      activeDefinition,
    ]);
    prisma.patient.update.mockResolvedValue({});
    prisma.patientFormFieldValue.deleteMany.mockResolvedValue({ count: 1 });
    prisma.patientFormFieldValue.createMany.mockResolvedValue({ count: 1 });

    const result = await service.update(
      7,
      {
        fullName: 'Ahmad Al-Hassan',
        birthDate: new Date('1990-01-31'),
        gender: 'MALE',
        formValues: [{ key: 'chronic_diseases', value: ['diabetes'] }],
      },
      appContext,
    );

    expect(prisma.patientFormFieldValue.deleteMany).toHaveBeenCalledWith({
      where: { patientId: 7 },
    });
    expect(prisma.patientFormFieldValue.createMany).toHaveBeenCalledWith({
      data: [
        {
          patientId: 7,
          fieldDefinitionId: 1,
          value: ['diabetes'],
          updatedByAccountId: 5,
        },
      ],
    });
    expect(result.formValues).toEqual([
      { key: 'chronic_diseases', value: ['diabetes'] },
    ]);
  });
});
