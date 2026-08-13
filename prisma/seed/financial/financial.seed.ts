import {
  InvoiceStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../src/common/prisma/services/prisma.service';

const DEMO_PLAN_A_S2_TITLE = 'Demo Plan A — Canal Cleaning';
const DEMO_PLAN_B_S2_TITLE = 'Demo Plan B — Template Pending Second';
const DEMO_PLAN_C_S2_TITLE = 'Demo Plan C — Completed Whitening Mid';

type SeedInvoiceItem = {
  descriptionAr: string;
  descriptionEn: string;
  quantity: number;
  unitPrice: number;
};

type SeedPayment = {
  amount: number;
  notes?: string;
  paidAt: Date;
};

type SeedInvoice = {
  invoiceNumber: string;
  treatmentPlanId: number | null;
  issuedAt: Date;
  items: SeedInvoiceItem[];
  payments: SeedPayment[];
};

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function deriveStatus(
  totalAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
): InvoiceStatus {
  if (paidAmount.lte(0)) {
    return InvoiceStatus.UNPAID;
  }
  if (paidAmount.gte(totalAmount)) {
    return InvoiceStatus.PAID;
  }
  return InvoiceStatus.PARTIALLY_PAID;
}

/**
 * Demo invoices/payments for MRN900001 — aligned with Plan A/B/C costs.
 *
 * Plan A (manual): S2 actualCost 165000 (estimate 150000)
 *   INV-SEED-A-01  150000 PAID
 *   INV-SEED-A-02   15000 UNPAID  (additional after extra actual cost)
 *
 * Plan B (root canal template): S1 booked, estimate 500
 *   INV-SEED-B-01     500 UNPAID
 *
 * Plan C (whitening completed): S2 actual 155000, S3 actual 105000
 *   INV-SEED-C-01  155000 PAID
 *   INV-SEED-C-02  105000 PARTIALLY_PAID (60000 paid)
 *
 * Patient-level (no plan):
 *   INV-SEED-P-01   25000 UNPAID
 */
export async function upsertDemoFinancials(prisma: PrismaService) {
  const patient = await prisma.patient.findFirst({
    where: { medicalRecordNumber: 'MRN900001' },
  });
  if (!patient) {
    console.warn('[seed] demo patient MRN900001 not found — skip financial seed');
    return;
  }

  const doctor = await prisma.account.findUnique({
    where: { phone: '0999999999' },
  });
  if (!doctor) {
    throw new Error('Doctor account 0999999999 not found — seed accounts first');
  }

  const planA = await prisma.treatmentPlan.findFirst({
    where: {
      patientId: patient.id,
      sessions: { some: { titleEn: DEMO_PLAN_A_S2_TITLE } },
    },
  });
  const planB = await prisma.treatmentPlan.findFirst({
    where: {
      patientId: patient.id,
      sessions: { some: { titleEn: DEMO_PLAN_B_S2_TITLE } },
    },
  });
  const planC = await prisma.treatmentPlan.findFirst({
    where: {
      patientId: patient.id,
      sessions: { some: { titleEn: DEMO_PLAN_C_S2_TITLE } },
    },
  });

  if (!planA || !planB || !planC) {
    throw new Error(
      'Demo treatment plans A/B/C not found — seed demo patient journey first',
    );
  }

  const invoices: SeedInvoice[] = [
    {
      invoiceNumber: 'INV-SEED-A-01',
      treatmentPlanId: planA.id,
      issuedAt: new Date(2026, 7, 15, 12, 0, 0, 0),
      items: [
        {
          descriptionAr: 'تنظيف القنوات العصبية — خطة أ',
          descriptionEn: 'Canal cleaning — Plan A',
          quantity: 1,
          unitPrice: 150000,
        },
      ],
      payments: [
        {
          amount: 100000,
          notes: 'دفعة أولى نقداً',
          paidAt: new Date(2026, 7, 15, 12, 30, 0, 0),
        },
        {
          amount: 50000,
          notes: 'تسديد المتبقي',
          paidAt: new Date(2026, 7, 16, 10, 0, 0, 0),
        },
      ],
    },
    {
      invoiceNumber: 'INV-SEED-A-02',
      treatmentPlanId: planA.id,
      issuedAt: new Date(),
      items: [
        {
          descriptionAr: 'زيادة تكلفة تنظيف القناة (التكلفة الفعلية)',
          descriptionEn: 'Additional canal-cleaning cost (actual vs estimate)',
          quantity: 1,
          unitPrice: 15000,
        },
      ],
      payments: [],
    },
    {
      invoiceNumber: 'INV-SEED-B-01',
      treatmentPlanId: planB.id,
      issuedAt: new Date(),
      items: [
        {
          descriptionAr: 'زيارة أولى (استشارة) — علاج عصب',
          descriptionEn: 'First visit (consultation) — Root canal',
          quantity: 1,
          unitPrice: 500,
        },
      ],
      payments: [],
    },
    {
      invoiceNumber: 'INV-SEED-C-01',
      treatmentPlanId: planC.id,
      issuedAt: new Date(2026, 5, 24, 12, 0, 0, 0),
      items: [
        {
          descriptionAr: 'جلسة التبييض',
          descriptionEn: 'Whitening session',
          quantity: 1,
          unitPrice: 155000,
        },
      ],
      payments: [
        {
          amount: 155000,
          notes: 'سداد كامل نقداً',
          paidAt: new Date(2026, 5, 24, 12, 20, 0, 0),
        },
      ],
    },
    {
      invoiceNumber: 'INV-SEED-C-02',
      treatmentPlanId: planC.id,
      issuedAt: new Date(2026, 6, 8, 12, 0, 0, 0),
      items: [
        {
          descriptionAr: 'جلسة متابعة تبييض',
          descriptionEn: 'Whitening follow-up session',
          quantity: 1,
          unitPrice: 105000,
        },
      ],
      payments: [
        {
          amount: 60000,
          notes: 'دفعة جزئية',
          paidAt: new Date(2026, 6, 8, 12, 15, 0, 0),
        },
      ],
    },
    {
      invoiceNumber: 'INV-SEED-P-01',
      treatmentPlanId: null,
      issuedAt: new Date(2026, 7, 10, 9, 0, 0, 0),
      items: [
        {
          descriptionAr: 'أدوية ومستلزمات',
          descriptionEn: 'Medication and supplies',
          quantity: 1,
          unitPrice: 25000,
        },
      ],
      payments: [],
    },
  ];

  for (const spec of invoices) {
    await upsertSeedInvoice(prisma, {
      patientId: patient.id,
      createdByAccountId: doctor.id,
      receivedByAccountId: doctor.id,
      spec,
    });
  }
}

async function upsertSeedInvoice(
  prisma: PrismaService,
  input: {
    patientId: number;
    createdByAccountId: number;
    receivedByAccountId: number;
    spec: SeedInvoice;
  },
) {
  const { spec } = input;
  const items = spec.items.map((item) => {
    const quantity = money(item.quantity);
    const unitPrice = money(item.unitPrice);
    return {
      descriptionAr: item.descriptionAr,
      descriptionEn: item.descriptionEn,
      quantity,
      unitPrice,
      totalAmount: quantity.mul(unitPrice),
    };
  });
  const totalAmount = items.reduce(
    (sum, item) => sum.add(item.totalAmount),
    money(0),
  );
  const paidAmount = spec.payments.reduce(
    (sum, payment) => sum.add(money(payment.amount)),
    money(0),
  );
  const status = deriveStatus(totalAmount, paidAmount);

  const existing = await prisma.invoice.findUnique({
    where: { invoiceNumber: spec.invoiceNumber },
    select: { id: true },
  });

  if (existing) {
    await prisma.payment.deleteMany({ where: { invoiceId: existing.id } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
    await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        patientId: input.patientId,
        treatmentPlanId: spec.treatmentPlanId,
        createdByAccountId: input.createdByAccountId,
        status,
        totalAmount,
        issuedAt: spec.issuedAt,
        items: { create: items },
        payments: {
          create: spec.payments.map((payment) => ({
            amount: money(payment.amount),
            method: PaymentMethod.CASH,
            receivedByAccountId: input.receivedByAccountId,
            paidAt: payment.paidAt,
            notes: payment.notes ?? null,
          })),
        },
      },
    });
    return;
  }

  await prisma.invoice.create({
    data: {
      patientId: input.patientId,
      treatmentPlanId: spec.treatmentPlanId,
      createdByAccountId: input.createdByAccountId,
      invoiceNumber: spec.invoiceNumber,
      status,
      totalAmount,
      issuedAt: spec.issuedAt,
      items: { create: items },
      payments: {
        create: spec.payments.map((payment) => ({
          amount: money(payment.amount),
          method: PaymentMethod.CASH,
          receivedByAccountId: input.receivedByAccountId,
          paidAt: payment.paidAt,
          notes: payment.notes ?? null,
        })),
      },
    },
  });
}
