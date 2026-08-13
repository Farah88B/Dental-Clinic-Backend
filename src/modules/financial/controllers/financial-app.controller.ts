import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import { HasPagination } from 'src/common/pagination/pagination-query-params.decorator';
import {
  AppInvoiceListQueryDto,
  AppPaymentListQueryDto,
  FinancialSummaryQueryDto,
} from '../dto/invoice-list-query.dto';
import {
  FinancialSummaryResponseDto,
  InvoiceDetailResponseDto,
  InvoiceListResponseDto,
  PaymentListResponseDto,
  PaymentResponseDto,
} from '../dto/invoice-response.dto';
import { FinancialStatementService } from '../services/financial-statement.service';
import { InvoiceService } from '../services/invoice.service';
import { PaymentService } from '../services/payment.service';

@ApiTags('Financial — Patient App')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller()
export class FinancialAppController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly statementService: FinancialStatementService,
  ) {}

  @Get('invoices')
  @HasPagination()
  @ApiOperation({
    summary:
      'List invoices for one owned patient or full account, with patient image and summary',
  })
  @ApiQuery({ name: 'patientId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'treatmentPlanId', required: false, type: Number })
  @ApiBaseResponse(InvoiceListResponseDto)
  listInvoices(
    @Query() query: AppInvoiceListQueryDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.invoiceService.listForAccount(accountId, query);
  }

  @Get('invoices/:id')
  @ApiOperation({
    summary: 'Invoice details for an owned patient (incl. profile image)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(InvoiceDetailResponseDto)
  getInvoice(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    return this.invoiceService.getDetailForAccount(
      id,
      user.id,
      user.preferredLanguage === 'en' ? 'en' : 'ar',
    );
  }

  @Get('invoices/:id/payments')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Payments for an owned invoice' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(PaymentResponseDto)
  async listInvoicePayments(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('id') accountId: number,
  ) {
    const items = await this.paymentService.listForInvoiceAccount(
      id,
      accountId,
    );
    return new AdminListDto(items, items.length);
  }

  @Get('payments')
  @HasPagination()
  @ApiOperation({
    summary:
      'Payment history for owned patients (FR-P-49); optional patientId filter',
  })
  @ApiQuery({ name: 'patientId', required: false, type: Number })
  @ApiBaseResponse(PaymentListResponseDto)
  listPayments(
    @Query() query: AppPaymentListQueryDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.paymentService.listForAccount(accountId, query);
  }

  @Get('financial-summary')
  @ApiOperation({
    summary:
      'Financial summary for one owned patient (patientId) or full family account',
  })
  @ApiQuery({ name: 'patientId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiBaseResponse(FinancialSummaryResponseDto)
  financialSummary(
    @Query() query: FinancialSummaryQueryDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.statementService.getAppFinancialSummary(accountId, query);
  }
}
