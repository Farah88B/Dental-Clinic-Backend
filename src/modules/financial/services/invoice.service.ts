import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PatientStatus,
  Prisma,
} from '@prisma/client';
import { FINANCIAL_ERROR_CODES } from 'src/common/constants/financial.constants';
import type { Language } from 'src/common/i18n/helper';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { NotificationRecipientService } from 'src/modules/notification/services/notification-recipient.service';
import { InvoiceAdapter } from '../adapter/invoice.adapter';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import {
  AppInvoiceListQueryDto,
  InvoiceListQueryDto,
} from '../dto/invoice-list-query.dto';
import {
  InvoiceDetailResponseDto,
  InvoiceListResponseDto,
} from '../dto/invoice-response.dto';
import {
  invoiceDetailSelect,
  invoiceListSelect,
} from '../selectors/invoice.select';
import { InvoiceNumberService } from './invoice-number.service';
import { FinancialNotificationService } from './financial-notification.service';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly invoiceAdapter: InvoiceAdapter,
    private readonly financialNotifications: FinancialNotificationService,
    private readonly notificationRecipients: NotificationRecipientService,
  ) {}

  async create(
    dto: CreateInvoiceDto,
    createdByAccountId: number,
  ): Promise<InvoiceDetailResponseDto> {
    if (!dto.items?.length) {
      throw new BadRequestException(
        FINANCIAL_ERROR_CODES.INVALID_INVOICE_ITEMS,
      );
    }

    for (const item of dto.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(
          FINANCIAL_ERROR_CODES.INVALID_INVOICE_ITEM_QUANTITY,
        );
      }
      if (item.unitPrice < 0) {
        throw new BadRequestException(
          FINANCIAL_ERROR_CODES.INVALID_INVOICE_ITEM_UNIT_PRICE,
        );
      }
    }

    const patient = await this.prisma.patient.findUniqueOrThrow({
      where: { id: dto.patientId },
      select: { id: true, status: true },
    });
    if (patient.status === PatientStatus.ARCHIVED) {
      throw new BadRequestException(
        FINANCIAL_ERROR_CODES.PATIENT_ARCHIVED_CANNOT_INVOICE,
      );
    }

    await this.assertTreatmentPlanLink(dto);

    const preparedItems = dto.items.map((item) => {
      const quantity = new Prisma.Decimal(item.quantity);
      const unitPrice = new Prisma.Decimal(item.unitPrice);
      return {
        descriptionAr: item.descriptionAr ?? null,
        descriptionEn: item.descriptionEn ?? null,
        quantity,
        unitPrice,
        totalAmount: quantity.mul(unitPrice),
      };
    });
    const totalAmount = preparedItems.reduce(
      (sum, item) => sum.add(item.totalAmount),
      new Prisma.Decimal(0),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.invoiceNumberService.generate(tx);
      return tx.invoice.create({
        data: {
          patientId: dto.patientId,
          treatmentPlanId: dto.treatmentPlanId,
          createdByAccountId,
          invoiceNumber,
          status: InvoiceStatus.UNPAID,
          totalAmount,
          items: {
            create: preparedItems.map((item) => ({
              descriptionAr: item.descriptionAr,
              descriptionEn: item.descriptionEn,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
            })),
          },
        },
        select: invoiceDetailSelect,
      });
    });

    this.notificationRecipients.dispatchSafely(
      this.financialNotifications.onInvoiceCreated({
        invoiceId: created.id,
        patientId: created.patientId,
        invoiceNumber: created.invoiceNumber,
        totalAmount: created.totalAmount,
      }),
      `invoice.create:${created.id}`,
    );

    return this.invoiceAdapter.adaptDetail(created, { bilingualItems: true });
  }

  async listForStaff(
    query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    const where = this.buildStaffWhere(query);
    const orderBy = {
      [query.sortBy ?? 'issuedAt']: query.sortDirection ?? 'desc',
    } as Prisma.InvoiceOrderByWithRelationInput;

    const [rows, total, summaryRows] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        select: invoiceListSelect,
        orderBy,
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        select: {
          totalAmount: true,
          payments: { select: { amount: true } },
        },
      }),
    ]);

    return new InvoiceListResponseDto(
      rows.map((row) => this.invoiceAdapter.adaptListItem(row)),
      total,
      this.invoiceAdapter.adaptListSummary(summaryRows),
    );
  }

  async listForAccount(
    accountId: number,
    query: AppInvoiceListQueryDto,
    language: Language = 'ar',
  ): Promise<InvoiceListResponseDto> {
    if (query.patientId != null) {
      await this.assertOwnedPatient(query.patientId, accountId);
    }

    const where: Prisma.InvoiceWhereInput = {
      patient: {
        accountId,
        ...(query.patientId != null ? { id: query.patientId } : {}),
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.treatmentPlanId != null
        ? { treatmentPlanId: query.treatmentPlanId }
        : {}),
    };

    const [rows, total, summaryRows] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        select: invoiceListSelect,
        orderBy: { issuedAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        select: {
          totalAmount: true,
          payments: { select: { amount: true } },
        },
      }),
    ]);

    return new InvoiceListResponseDto(
      rows.map((row) => this.invoiceAdapter.adaptListItem(row, { language })),
      total,
      this.invoiceAdapter.adaptListSummary(summaryRows),
    );
  }

  async getDetailForStaff(id: number): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      select: invoiceDetailSelect,
    });
    return this.invoiceAdapter.adaptDetail(invoice, { bilingualItems: true });
  }

  async getDetailForAccount(
    id: number,
    accountId: number,
    language: Language,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      select: invoiceDetailSelect,
    });
    await this.assertOwnedPatient(invoice.patientId, accountId);
    return this.invoiceAdapter.adaptDetail(invoice, { language });
  }

  private buildStaffWhere(query: InvoiceListQueryDto): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {};
    const patientFilter: Prisma.PatientWhereInput = {};

    if (query.accountId != null) {
      patientFilter.accountId = query.accountId;
    }
    if (query.patientId != null) {
      patientFilter.id = query.patientId;
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      patientFilter.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { medicalRecordNumber: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (Object.keys(patientFilter).length > 0) {
      where.patient = patientFilter;
    }

    if (query.status) {
      where.status = query.status;
    }
    if (query.treatmentPlanId != null) {
      where.treatmentPlanId = query.treatmentPlanId;
    }
    if (query.dateFrom || query.dateTo) {
      where.issuedAt = {};
      if (query.dateFrom) {
        where.issuedAt.gte = query.dateFrom;
      }
      if (query.dateTo) {
        where.issuedAt.lte = query.dateTo;
      }
    }

    return where;
  }

  private async assertTreatmentPlanLink(dto: CreateInvoiceDto): Promise<void> {
    if (dto.treatmentPlanId == null) {
      return;
    }
    const plan = await this.prisma.treatmentPlan.findUniqueOrThrow({
      where: { id: dto.treatmentPlanId },
      select: { id: true, patientId: true },
    });
    if (plan.patientId !== dto.patientId) {
      throw new BadRequestException(
        FINANCIAL_ERROR_CODES.INVALID_INVOICE_RELATION,
      );
    }
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
