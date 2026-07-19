import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { HasPagination, PaginationQuery } from 'src/common/pagination/pagination-query-params.decorator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { AccountsService } from '../services/accounts.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { UpdateAccountStatusDto } from '../dto/update-account-status.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AccountResponseDto } from '../dto/account-response.dto';

// NOTE: JwtAuthGuard needs a registered 'jwt' Passport strategy to actually
// authenticate a request — that lands in Epic 3. Until then, these endpoints
// are structurally correct but cannot be exercised via Swagger; test the
// service/controller logic directly via unit tests instead.
@ApiTags('Accounts Administration (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @HasPagination()
  @RequirePermission('manage_staff')
  @ApiOperation({ summary: 'List staff accounts' })
  @ApiPaginatedResponse(AccountResponseDto)
  list(@PaginationQuery() pagination: PaginationDto) {
    return this.accountsService.list(pagination);
  }

  @Get(':id')
  @RequirePermission('manage_staff')
  @ApiOperation({ summary: 'Get account details- يُستخدم من: لوحة تحكم الطاقم' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AccountResponseDto)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.accountsService.findOne(id);
  }

  @Post()
  @RequirePermission('manage_staff')
  @AuditAction('CREATE_STAFF_ACCOUNT')
  @ApiOperation({ summary: 'Create a staff account invitation (Secretary, etc.)- يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(AccountResponseDto, 201)
  create(@Body() dto: CreateAccountDto, @ReqUser('id') currentAccountId: number) {
    return this.accountsService.create(dto, currentAccountId);
  }

  @Patch(':id')
  @RequirePermission('manage_staff')
  @AuditAction('UPDATE_ACCOUNT')
  @ApiOperation({ summary: 'Update account information- يُستخدم من: لوحة تحكم الطاقم' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AccountResponseDto)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('manage_staff')
  @AuditAction('UPDATE_ACCOUNT_STATUS')
  @ApiOperation({ summary: 'Enable or disable an account- يُستخدم من: لوحة تحكم الطاقم' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AccountResponseDto)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountStatusDto,
    @ReqUser('id') currentAccountId: number,
  ) {
    return this.accountsService.updateStatus(id, dto, currentAccountId);
  }
// TODO: delete this endpoint
/*
  @Patch(':id/reset-password')
  @RequirePermission('manage_staff')
  @AuditAction('RESET_ACCOUNT_PASSWORD')
  @ApiOperation({ summary: "Admin-triggered reset of a staff member's password" })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AccountResponseDto)
  resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPasswordDto) {
    return this.accountsService.resetPassword(id, dto);
  }
    */
}