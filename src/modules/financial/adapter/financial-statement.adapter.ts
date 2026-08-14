import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Language } from 'src/common/i18n/helper';
import {
  AccountStatementResponseDto,
  FinancialSummaryPatientDto,
  FinancialSummaryResponseDto,
} from '../dto/invoice-response.dto';
import {
  moneyString,
  sumAmounts,
} from '../helpers/financial-money.helper';
import { InvoiceAdapter } from './invoice.adapter';
import {
  RawInvoiceListItem,
} from '../selectors/invoice.select';

type PatientBucket = {
  patientId: number;
  fullName: string;
  medicalRecordNumber: string;
  invoices: RawInvoiceListItem[];
};

@Injectable()
export class FinancialStatementAdapter {
  constructor(private readonly invoiceAdapter: InvoiceAdapter) {}

  adaptSummary(input: {
    scope: 'PATIENT' | 'FAMILY';
    patients: PatientBucket[];
    language?: Language;
  }): FinancialSummaryResponseDto {
    const language = input.language ?? 'ar';
    const patientDtos = input.patients.map((patient) => {
      const billed = sumAmounts(patient.invoices.map((i) => i.totalAmount));
      const paid = sumAmounts(
        patient.invoices.flatMap((i) => i.payments.map((p) => p.amount)),
      );
      const remaining = Prisma.Decimal.max(
        billed.sub(paid),
        new Prisma.Decimal(0),
      );

      return new FinancialSummaryPatientDto({
        patientId: patient.patientId,
        fullName: patient.fullName,
        medicalRecordNumber: patient.medicalRecordNumber,
        totalBilled: moneyString(billed),
        totalPaid: moneyString(paid),
        totalRemaining: moneyString(remaining),
        invoices: patient.invoices.map((invoice) =>
          this.invoiceAdapter.adaptListItem(invoice, {
            includePatient: false,
            language,
          }),
        ),
      });
    });

    const totalBilled = sumAmounts(
      patientDtos.map((p) => p.totalBilled),
    );
    const totalPaid = sumAmounts(patientDtos.map((p) => p.totalPaid));
    const totalRemaining = Prisma.Decimal.max(
      totalBilled.sub(totalPaid),
      new Prisma.Decimal(0),
    );

    return new FinancialSummaryResponseDto({
      scope: input.scope,
      totalBilled: moneyString(totalBilled),
      totalPaid: moneyString(totalPaid),
      totalRemaining: moneyString(totalRemaining),
      patients: patientDtos,
    });
  }

  adaptStatement(input: {
    invoices: RawInvoiceListItem[];
  }): AccountStatementResponseDto {
    const totalBilled = sumAmounts(input.invoices.map((i) => i.totalAmount));
    const totalPaid = sumAmounts(
      input.invoices.flatMap((i) => i.payments.map((p) => p.amount)),
    );
    const totalRemaining = Prisma.Decimal.max(
      totalBilled.sub(totalPaid),
      new Prisma.Decimal(0),
    );

    return new AccountStatementResponseDto({
      totalBilled: moneyString(totalBilled),
      totalPaid: moneyString(totalPaid),
      totalRemaining: moneyString(totalRemaining),
      invoices: input.invoices.map((invoice) =>
        this.invoiceAdapter.adaptListItem(invoice),
      ),
    });
  }
}
