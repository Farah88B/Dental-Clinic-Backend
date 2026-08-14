import { Prisma } from '@prisma/client';

export const invoicePatientSelect = {
  id: true,
  fullName: true,
  medicalRecordNumber: true,
  profileImage: {
    select: { id: true, path: true },
  },
} satisfies Prisma.PatientSelect;

export const invoiceItemSelect = {
  id: true,
  descriptionAr: true,
  descriptionEn: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
} satisfies Prisma.InvoiceItemSelect;

export const paymentSelect = {
  id: true,
  invoiceId: true,
  amount: true,
  method: true,
  receivedByAccountId: true,
  paidAt: true,
  notes: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

export const invoiceTreatmentPlanSelect = {
  nameAr: true,
  nameEn: true,
  template: {
    select: {
      nameAr: true,
      nameEn: true,
    },
  },
} satisfies Prisma.TreatmentPlanSelect;

export const invoiceListSelect = {
  id: true,
  invoiceNumber: true,
  patientId: true,
  treatmentPlanId: true,
  status: true,
  totalAmount: true,
  issuedAt: true,
  patient: { select: invoicePatientSelect },
  treatmentPlan: { select: invoiceTreatmentPlanSelect },
  payments: {
    select: paymentSelect,
    orderBy: { paidAt: 'asc' as const },
  },
} satisfies Prisma.InvoiceSelect;

export const invoiceDetailSelect = {
  id: true,
  invoiceNumber: true,
  patientId: true,
  treatmentPlanId: true,
  createdByAccountId: true,
  status: true,
  totalAmount: true,
  issuedAt: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: invoicePatientSelect },
  treatmentPlan: { select: invoiceTreatmentPlanSelect },
  items: {
    select: invoiceItemSelect,
    orderBy: { id: 'asc' as const },
  },
  payments: {
    select: paymentSelect,
    orderBy: { paidAt: 'asc' as const },
  },
} satisfies Prisma.InvoiceSelect;

export type RawInvoiceListItem = Prisma.InvoiceGetPayload<{
  select: typeof invoiceListSelect;
}>;

export type RawInvoiceDetail = Prisma.InvoiceGetPayload<{
  select: typeof invoiceDetailSelect;
}>;

export type RawPayment = Prisma.PaymentGetPayload<{
  select: typeof paymentSelect;
}>;
