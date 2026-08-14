import { ForbiddenException, Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import type { Language } from 'src/common/i18n/helper';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { FinancialStatementAdapter } from '../adapter/financial-statement.adapter';
import { FinancialSummaryQueryDto } from '../dto/invoice-list-query.dto';
import {
  AccountStatementResponseDto,
  FinancialSummaryResponseDto,
} from '../dto/invoice-response.dto';
import { invoiceListSelect } from '../selectors/invoice.select';

@Injectable()
export class FinancialStatementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statementAdapter: FinancialStatementAdapter,
  ) {}

  async getPatientStatement(
    patientId: number,
    status?: InvoiceStatus,
  ): Promise<AccountStatementResponseDto> {
    await this.prisma.patient.findUniqueOrThrow({
      where: { id: patientId },
      select: { id: true },
    });

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      patientId,
      ...(status ? { status } : {}),
    };

    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      select: invoiceListSelect,
      orderBy: { issuedAt: 'asc' },
    });

    return this.statementAdapter.adaptStatement({ invoices });
  }

  async getAccountStatement(
    accountId: number,
    status?: InvoiceStatus,
  ): Promise<AccountStatementResponseDto> {
    await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { id: true },
    });

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      patient: { accountId },
      ...(status ? { status } : {}),
    };

    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      select: invoiceListSelect,
      orderBy: { issuedAt: 'asc' },
    });

    return this.statementAdapter.adaptStatement({ invoices });
  }

  async getAppFinancialSummary(
    accountId: number,
    query: FinancialSummaryQueryDto,
    language: Language = 'ar',
  ): Promise<FinancialSummaryResponseDto> {
    if (query.patientId != null) {
      await this.assertOwnedPatient(query.patientId, accountId);
    }

    const patients = await this.prisma.patient.findMany({
      where: {
        accountId,
        ...(query.patientId != null ? { id: query.patientId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        medicalRecordNumber: true,
      },
      orderBy: { id: 'asc' },
    });

    const patientIds = patients.map((p) => p.id);
    const invoiceWhere: Prisma.InvoiceWhereInput = {
      patientId: { in: patientIds },
      ...(query.status ? { status: query.status } : {}),
    };

    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      select: invoiceListSelect,
      orderBy: { issuedAt: 'asc' },
    });

    const buckets = patients.map((patient) => ({
      patientId: patient.id,
      fullName: patient.fullName,
      medicalRecordNumber: patient.medicalRecordNumber,
      invoices: invoices.filter((invoice) => invoice.patientId === patient.id),
    }));

    return this.statementAdapter.adaptSummary({
      scope: query.patientId != null ? 'PATIENT' : 'FAMILY',
      patients: buckets,
      language,
    });
  }

  private async assertOwnedPatient(
    patientId: number,
    accountId: number,
  ): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId, accountId },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException();
    }
  }
}
