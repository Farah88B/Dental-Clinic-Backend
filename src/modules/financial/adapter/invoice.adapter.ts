import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPublicMediaUrl } from 'src/common/media/helpers/media-path.helper';
import type { Language } from 'src/common/i18n/helper';
import {
  InvoiceDetailResponseDto,
  InvoiceItemResponseDto,
  InvoiceListItemDto,
  InvoiceListSummaryDto,
  InvoicePatientSummaryDto,
  PaymentResponseDto,
} from '../dto/invoice-response.dto';
import {
  moneyString,
  sumAmounts,
} from '../helpers/financial-money.helper';
import {
  RawInvoiceDetail,
  RawInvoiceListItem,
  RawPayment,
} from '../selectors/invoice.select';

@Injectable()
export class InvoiceAdapter {
  adaptPatientSummary(raw: RawInvoiceListItem['patient']): InvoicePatientSummaryDto {
    return new InvoicePatientSummaryDto({
      id: raw.id,
      fullName: raw.fullName,
      medicalRecordNumber: raw.medicalRecordNumber,
      profileImage: raw.profileImage
        ? { id: raw.profileImage.id, url: buildPublicMediaUrl(raw.profileImage.path) }
        : null,
    });
  }

  adaptListItem(
    raw: RawInvoiceListItem,
    options: { includePatient: boolean } = { includePatient: true },
  ): InvoiceListItemDto {
    const paidAmount = sumAmounts(raw.payments.map((p) => p.amount));
    const totalAmount = new Prisma.Decimal(raw.totalAmount);
    const remainingAmount = Prisma.Decimal.max(
      totalAmount.sub(paidAmount),
      new Prisma.Decimal(0),
    );

    return new InvoiceListItemDto({
      id: raw.id,
      invoiceNumber: raw.invoiceNumber,
      patientId: raw.patientId,
      treatmentPlanId: raw.treatmentPlanId,
      status: raw.status,
      totalAmount: moneyString(totalAmount),
      paidAmount: moneyString(paidAmount),
      remainingAmount: moneyString(remainingAmount),
      issuedAt: raw.issuedAt,
      patient: options.includePatient
        ? this.adaptPatientSummary(raw.patient)
        : undefined,
      payments: raw.payments.map((payment) => this.adaptPayment(payment)),
    });
  }

  adaptListSummary(
    invoices: Array<{
      totalAmount: Prisma.Decimal;
      payments: Array<{ amount: Prisma.Decimal }>;
    }>,
  ): InvoiceListSummaryDto {
    const totalBilled = sumAmounts(invoices.map((i) => i.totalAmount));
    const totalPaid = sumAmounts(
      invoices.flatMap((i) => i.payments.map((p) => p.amount)),
    );
    const totalRemaining = Prisma.Decimal.max(
      totalBilled.sub(totalPaid),
      new Prisma.Decimal(0),
    );

    return new InvoiceListSummaryDto({
      totalBilled: moneyString(totalBilled),
      totalPaid: moneyString(totalPaid),
      totalRemaining: moneyString(totalRemaining),
    });
  }

  adaptDetail(
    raw: RawInvoiceDetail,
    options: { language?: Language; bilingualItems?: boolean } = {},
  ): InvoiceDetailResponseDto {
    const paidAmount = sumAmounts(raw.payments.map((p) => p.amount));
    const totalAmount = new Prisma.Decimal(raw.totalAmount);
    const remainingAmount = Prisma.Decimal.max(
      totalAmount.sub(paidAmount),
      new Prisma.Decimal(0),
    );
    const language = options.language ?? 'ar';
    const bilingual = options.bilingualItems ?? false;

    return new InvoiceDetailResponseDto({
      id: raw.id,
      invoiceNumber: raw.invoiceNumber,
      patientId: raw.patientId,
      treatmentPlanId: raw.treatmentPlanId,
      createdByAccountId: raw.createdByAccountId,
      status: raw.status,
      totalAmount: moneyString(totalAmount),
      paidAmount: moneyString(paidAmount),
      remainingAmount: moneyString(remainingAmount),
      issuedAt: raw.issuedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      patient: this.adaptPatientSummary(raw.patient),
      items: raw.items.map(
        (item) =>
          new InvoiceItemResponseDto({
            id: item.id,
            description:
              language === 'en'
                ? (item.descriptionEn ?? item.descriptionAr)
                : (item.descriptionAr ?? item.descriptionEn),
            descriptionAr: bilingual ? item.descriptionAr : undefined,
            descriptionEn: bilingual ? item.descriptionEn : undefined,
            quantity: moneyString(item.quantity),
            unitPrice: moneyString(item.unitPrice),
            totalAmount: moneyString(item.totalAmount),
          }),
      ),
      payments: raw.payments.map((payment) => this.adaptPayment(payment)),
    });
  }

  adaptPayment(raw: RawPayment): PaymentResponseDto {
    return new PaymentResponseDto({
      id: raw.id,
      invoiceId: raw.invoiceId,
      amount: moneyString(raw.amount),
      method: raw.method,
      receivedByAccountId: raw.receivedByAccountId,
      paidAt: raw.paidAt,
      notes: raw.notes,
      createdAt: raw.createdAt,
    });
  }
}
