import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NOTIFICATION_TYPES } from 'src/common/constants/notification.constants';
import { moneyString } from 'src/modules/financial/helpers/financial-money.helper';
import { NotificationRecipientService } from 'src/modules/notification/services/notification-recipient.service';

@Injectable()
export class FinancialNotificationService {
  constructor(private readonly recipients: NotificationRecipientService) {}

  async onInvoiceCreated(input: {
    invoiceId: number;
    patientId: number;
    invoiceNumber: string;
    totalAmount: Prisma.Decimal;
  }): Promise<void> {
    const amount = moneyString(input.totalAmount);
    await this.recipients.notifyPatientByPatientId(input.patientId, {
      type: NOTIFICATION_TYPES.INVOICE_CREATED,
      titleAr: 'فاتورة جديدة',
      titleEn: 'New invoice',
      bodyAr: `تم إصدار فاتورة ${input.invoiceNumber} بمبلغ ${amount}.`,
      bodyEn: `Invoice ${input.invoiceNumber} was issued for ${amount}.`,
      data: {
        invoiceId: input.invoiceId,
        patientId: input.patientId,
      },
    });
  }

  async onPaymentReceived(input: {
    paymentId: number;
    invoiceId: number;
    patientId: number;
    invoiceNumber: string;
    amount: Prisma.Decimal;
  }): Promise<void> {
    const paid = moneyString(input.amount);
    await this.recipients.notifyPatientByPatientId(input.patientId, {
      type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      titleAr: 'تم استلام دفعة',
      titleEn: 'Payment received',
      bodyAr: `تم استلام دفعة بقيمة ${paid} للفاتورة ${input.invoiceNumber}.`,
      bodyEn: `A payment of ${paid} was received for invoice ${input.invoiceNumber}.`,
      data: {
        paymentId: input.paymentId,
        invoiceId: input.invoiceId,
        patientId: input.patientId,
      },
    });
  }
}
