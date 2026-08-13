import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  InvoiceStatus,
  PatientStatus,
  PaymentMethod,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { FINANCIAL_ERROR_CODES } from 'src/common/constants/financial.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { InvoiceAdapter } from '../adapter/invoice.adapter';
import { deriveInvoiceStatus } from '../helpers/financial-money.helper';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoiceService } from './invoice.service';
import { PaymentService } from './payment.service';

describe('deriveInvoiceStatus', () => {
  it('maps paid amounts to invoice statuses', () => {
    expect(deriveInvoiceStatus(new Decimal(100), new Decimal(0))).toBe(
      InvoiceStatus.UNPAID,
    );
    expect(deriveInvoiceStatus(new Decimal(100), new Decimal(40))).toBe(
      InvoiceStatus.PARTIALLY_PAID,
    );
    expect(deriveInvoiceStatus(new Decimal(100), new Decimal(100))).toBe(
      InvoiceStatus.PAID,
    );
  });
});

describe('InvoiceService.create', () => {
  let service: InvoiceService;

  const prisma = {
    patient: { findUniqueOrThrow: jest.fn() },
    treatmentPlan: { findUniqueOrThrow: jest.fn() },
    treatmentSession: { findUniqueOrThrow: jest.fn() },
    $transaction: jest.fn(),
  };

  const invoiceNumberService = {
    generate: jest.fn().mockResolvedValue('INV-000001'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoiceService,
        InvoiceAdapter,
        { provide: PrismaService, useValue: prisma },
        { provide: InvoiceNumberService, useValue: invoiceNumberService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get(InvoiceService);

    prisma.patient.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      status: PatientStatus.ACTIVE,
    });
  });

  it('rejects empty items', async () => {
    await expect(
      service.create({ patientId: 1, items: [] }, 9),
    ).rejects.toThrow(FINANCIAL_ERROR_CODES.INVALID_INVOICE_ITEMS);
  });

  it('rejects mismatched treatment plan patient', async () => {
    prisma.treatmentPlan.findUniqueOrThrow.mockResolvedValue({
      id: 5,
      patientId: 99,
    });

    await expect(
      service.create(
        {
          patientId: 1,
          treatmentPlanId: 5,
          items: [{ quantity: 1, unitPrice: 100 }],
        },
        9,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(
        {
          patientId: 1,
          treatmentPlanId: 5,
          items: [{ quantity: 1, unitPrice: 100 }],
        },
        9,
      ),
    ).rejects.toThrow(FINANCIAL_ERROR_CODES.INVALID_INVOICE_RELATION);
  });

  it('creates invoice with server-calculated totals', async () => {
    prisma.$transaction.mockImplementation(async (fn: Function) =>
      fn({
        invoice: {
          create: jest.fn().mockResolvedValue({
            id: 10,
            invoiceNumber: 'INV-000001',
            patientId: 1,
            treatmentPlanId: null,
            createdByAccountId: 9,
            status: InvoiceStatus.UNPAID,
            totalAmount: new Decimal(200),
            issuedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: {
              id: 1,
              fullName: 'A',
              medicalRecordNumber: 'MRN1',
              profileImage: null,
            },
            items: [
              {
                id: 1,
                descriptionAr: null,
                descriptionEn: null,
                quantity: new Decimal(2),
                unitPrice: new Decimal(100),
                totalAmount: new Decimal(200),
              },
            ],
            payments: [],
          }),
        },
      }),
    );

    const result = await service.create(
      {
        patientId: 1,
        items: [{ quantity: 2, unitPrice: 100 }],
      },
      9,
    );

    expect(result.totalAmount).toBe('200.00');
    expect(result.paidAmount).toBe('0.00');
    expect(result.remainingAmount).toBe('200.00');
    expect(result.status).toBe(InvoiceStatus.UNPAID);
  });
});

describe('PaymentService.create', () => {
  let service: PaymentService;

  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentService,
        InvoiceAdapter,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(PaymentService);
  });

  it('rejects overpayment', async () => {
    prisma.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        $queryRaw: jest.fn(),
        invoice: {
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValueOnce({
              id: 1,
              status: InvoiceStatus.UNPAID,
              totalAmount: new Decimal(100),
              payments: [{ amount: new Decimal(60) }],
            }),
        },
        payment: { create: jest.fn() },
      };
      return fn(tx);
    });

    await expect(
      service.create(1, { amount: 50, method: PaymentMethod.CASH }, 9),
    ).rejects.toThrow(FINANCIAL_ERROR_CODES.PAYMENT_EXCEEDS_REMAINING);
  });

  it('rejects payment on VOID invoice', async () => {
    prisma.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        $queryRaw: jest.fn(),
        invoice: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 1,
            status: InvoiceStatus.VOID,
            totalAmount: new Decimal(100),
            payments: [],
          }),
        },
        payment: { create: jest.fn() },
      };
      return fn(tx);
    });

    await expect(service.create(1, { amount: 10 }, 9)).rejects.toThrow(
      FINANCIAL_ERROR_CODES.INVOICE_VOID,
    );
  });

  it('records partial payment and returns updated detail', async () => {
    prisma.$transaction.mockImplementation(async (fn: Function) => {
      const tx = {
        $queryRaw: jest.fn(),
        invoice: {
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValueOnce({
              id: 1,
              status: InvoiceStatus.UNPAID,
              totalAmount: new Decimal(100),
              payments: [],
            })
            .mockResolvedValueOnce({
              id: 1,
              invoiceNumber: 'INV-000001',
              patientId: 1,
              treatmentPlanId: null,
              createdByAccountId: 9,
              status: InvoiceStatus.PARTIALLY_PAID,
              totalAmount: new Decimal(100),
              issuedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: 1,
                fullName: 'A',
                medicalRecordNumber: 'MRN1',
                profileImage: null,
              },
              items: [],
              payments: [
                {
                  id: 1,
                  invoiceId: 1,
                  amount: new Decimal(40),
                  method: PaymentMethod.CASH,
                  receivedByAccountId: 9,
                  paidAt: new Date(),
                  notes: null,
                  createdAt: new Date(),
                },
              ],
            }),
          update: jest.fn(),
        },
        payment: { create: jest.fn() },
      };
      return fn(tx);
    });

    const result = await service.create(1, { amount: 40 }, 9);
    expect(result.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(result.paidAmount).toBe('40.00');
    expect(result.remainingAmount).toBe('60.00');
    expect(result.payments).toHaveLength(1);
  });
});
