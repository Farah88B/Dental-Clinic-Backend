import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { HasPagination } from 'src/common/pagination/pagination-query-params.decorator';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { InvoiceListQueryDto } from '../dto/invoice-list-query.dto';
import {
  AccountStatementResponseDto,
  InvoiceDetailResponseDto,
  InvoiceListResponseDto,
  PaymentResponseDto,
} from '../dto/invoice-response.dto';
import { FinancialStatementService } from '../services/financial-statement.service';
import { InvoiceService } from '../services/invoice.service';
import { PaymentService } from '../services/payment.service';

@ApiTags('Financial — Staff Dashboard')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class FinancialDashboardController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly statementService: FinancialStatementService,
  ) {}

  @Post('invoices')
  @RequirePermission('create_invoice')
  @AuditAction('CREATE_INVOICE')
  @ApiOperation({ summary: 'Create a new invoice for a patient - Staff' })
  @ApiBaseResponse(InvoiceDetailResponseDto, 201)
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.invoiceService.create(dto, accountId);
  }

  @Get('invoices')
  @RequirePermission('view_invoices')
  @HasPagination()
  @ApiOperation({
    summary:
      'List invoices with patient (incl. image) and filter-scope summary - Staff',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'patientId', required: false, type: Number })
  @ApiQuery({
    name: 'accountId',
    required: false,
    type: Number,
    description: 'All patients linked to this account',
  })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'treatmentPlanId', required: false, type: Number })
  @ApiBaseResponse(InvoiceListResponseDto)
  listInvoices(@Query() query: InvoiceListQueryDto) {
    return this.invoiceService.listForStaff(query);
  }

  @Get('invoices/:id')
  @RequirePermission('view_invoices')
  @ApiOperation({
    summary:
      'Invoice details including patient image, items, and payments - Staff',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(InvoiceDetailResponseDto)
  getInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.getDetailForStaff(id);
  }

  @Post('invoices/:id/payments')
  @RequirePermission('record_payment')
  @AuditAction('CREATE_PAYMENT')
  @ApiOperation({ summary: 'Record a cash payment on an invoice - Staff' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(InvoiceDetailResponseDto, 201)
  createPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.paymentService.create(id, dto, accountId);
  }

  @Get('invoices/:id/payments')
  @RequirePermission('view_invoices')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'List payments for an invoice - Staff' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(PaymentResponseDto)
  async listInvoicePayments(@Param('id', ParseIntPipe) id: number) {
    const items = await this.paymentService.listForInvoiceStaff(id);
    return new AdminListDto(items, items.length);
  }

  @Get('patients/:patientId/account-statement')
  @RequirePermission('view_financial_reports')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Patient financial account statement - Staff' })
  @ApiParam({ name: 'patientId', type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiBaseResponse(AccountStatementResponseDto)
  patientStatement(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.statementService.getPatientStatement(patientId, status);
  }

  @Get('accounts/:accountId/account-statement')
  @RequirePermission('view_financial_reports')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Family/account financial statement (all linked patients) - Staff',
  })
  @ApiParam({ name: 'accountId', type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiBaseResponse(AccountStatementResponseDto)
  accountStatement(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.statementService.getAccountStatement(accountId, status);
  }
}
