import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import { FINANCIAL_ERROR_CODES } from 'src/common/constants/financial.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { NotificationRecipientService } from 'src/modules/notification/services/notification-recipient.service';
import { InvoiceAdapter } from '../adapter/invoice.adapter';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { AppPaymentListQueryDto } from '../dto/invoice-list-query.dto';
import {
  InvoiceDetailResponseDto,
  PaymentResponseDto,
} from '../dto/invoice-response.dto';
import {
  deriveInvoiceStatus,
  sumAmounts,
} from '../helpers/financial-money.helper';
import {
  invoiceDetailSelect,
  paymentSelect,
} from '../selectors/invoice.select';
import { FinancialNotificationService } from './financial-notification.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceAdapter: InvoiceAdapter,
    private readonly financialNotifications: FinancialNotificationService,
    private readonly notificationRecipients: NotificationRecipientService,
  ) {}

  async create(
    invoiceId: number,
    dto: CreatePaymentDto,
    receivedByAccountId: number,
  ): Promise<InvoiceDetailResponseDto> {
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException(
        FINANCIAL_ERROR_CODES.INVALID_PAYMENT_AMOUNT,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE
      `;

      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          payments: { select: { amount: true } },
        },
      });

      if (invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException(FINANCIAL_ERROR_CODES.INVOICE_VOID);
      }
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException(
          FINANCIAL_ERROR_CODES.INVOICE_ALREADY_PAID,
        );
      }

      const paidSoFar = sumAmounts(invoice.payments.map((p) => p.amount));
      const remaining = new Prisma.Decimal(invoice.totalAmount).sub(paidSoFar);

      if (remaining.lte(0)) {
        throw new BadRequestException(
          FINANCIAL_ERROR_CODES.INVOICE_ALREADY_PAID,
        );
      }
      if (amount.gt(remaining)) {
        throw new BadRequestException(
          FINANCIAL_ERROR_CODES.PAYMENT_EXCEEDS_REMAINING,
        );
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount,
          method: dto.method ?? PaymentMethod.CASH,
          notes: dto.notes,
          receivedByAccountId,
        },
        select: { id: true },
      });

      const paidAfter = paidSoFar.add(amount);
      const nextStatus = deriveInvoiceStatus(
        new Prisma.Decimal(invoice.totalAmount),
        paidAfter,
      );

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: nextStatus },
      });

      const invoiceDetail = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        select: invoiceDetailSelect,
      });

      return { invoiceDetail, paymentId: payment.id, paymentAmount: amount };
    });

    this.notificationRecipients.dispatchSafely(
      this.financialNotifications.onPaymentReceived({
        paymentId: updated.paymentId,
        invoiceId: updated.invoiceDetail.id,
        patientId: updated.invoiceDetail.patientId,
        invoiceNumber: updated.invoiceDetail.invoiceNumber,
        amount: updated.paymentAmount,
      }),
      `payment.create:${updated.paymentId}`,
    );

    return this.invoiceAdapter.adaptDetail(updated.invoiceDetail, {
      bilingualItems: true,
    });
  }

  async listForInvoiceStaff(invoiceId: number): Promise<PaymentResponseDto[]> {
    await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: { id: true },
    });

    const payments = await this.prisma.payment.findMany({
      where: { invoiceId },
      select: paymentSelect,
      orderBy: { paidAt: 'asc' },
    });

    return payments.map((p) => this.invoiceAdapter.adaptPayment(p));
  }

  async listForInvoiceAccount(
    invoiceId: number,
    accountId: number,
  ): Promise<PaymentResponseDto[]> {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: { id: true, patientId: true },
    });
    await this.assertOwnedPatient(invoice.patientId, accountId);

    const payments = await this.prisma.payment.findMany({
      where: { invoiceId },
      select: paymentSelect,
      orderBy: { paidAt: 'asc' },
    });

    return payments.map((p) => this.invoiceAdapter.adaptPayment(p));
  }

  async listForAccount(
    accountId: number,
    query: AppPaymentListQueryDto,
  ): Promise<AdminListDto<PaymentResponseDto>> {
    if (query.patientId != null) {
      await this.assertOwnedPatient(query.patientId, accountId);
    }

    const where: Prisma.PaymentWhereInput = {
      invoice: {
        patient: {
          accountId,
          ...(query.patientId != null ? { id: query.patientId } : {}),
        },
      },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        select: paymentSelect,
        orderBy: { paidAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return new AdminListDto(
      rows.map((p) => this.invoiceAdapter.adaptPayment(p)),
      total,
    );
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
