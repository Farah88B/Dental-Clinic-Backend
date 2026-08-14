import { Module } from '@nestjs/common';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { FinancialStatementAdapter } from './adapter/financial-statement.adapter';
import { InvoiceAdapter } from './adapter/invoice.adapter';
import { FinancialAppController } from './controllers/financial-app.controller';
import { FinancialDashboardController } from './controllers/financial-dashboard.controller';
import { FinancialStatementService } from './services/financial-statement.service';
import { FinancialNotificationService } from './services/financial-notification.service';
import { InvoiceNumberService } from './services/invoice-number.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [NotificationModule],
  controllers: [FinancialDashboardController, FinancialAppController],
  providers: [
    InvoiceNumberService,
    InvoiceAdapter,
    FinancialStatementAdapter,
    FinancialNotificationService,
    InvoiceService,
    PaymentService,
    FinancialStatementService,
  ],
  exports: [InvoiceService, PaymentService, FinancialStatementService],
})
export class FinancialModule {}
