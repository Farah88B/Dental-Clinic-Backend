import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { AccountRolesService } from '../services/account-roles.service';
import { AssignAccountRoleDto } from '../dto/assign-account-role.dto';
import { AccountResponseDto } from 'src/modules/accounts/dto/account-response.dto';

@ApiTags('RBAC (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounts/:accountId/roles')
export class AccountRolesController {
  constructor(private readonly accountRolesService: AccountRolesService) {}

  @Get()
  @RequirePermission('manage_staff')
  @ApiOperation({ summary: 'List roles assigned to an account — يُستخدم من: لوحة تحكم الطاقم' })
  listForAccount(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.accountRolesService.listForAccount(accountId);
  }

  @Post()
  @RequirePermission('manage_staff')
  @AuditAction('ASSIGN_ACCOUNT_ROLE')
  @ApiOperation({ summary: 'Assign a role to an account (additive) — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(AccountResponseDto, 201)
  assign(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body() dto: AssignAccountRoleDto,
  ) {
    return this.accountRolesService.assign(accountId, dto.roleId);
  }

  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('manage_staff')
  @AuditAction('REVOKE_ACCOUNT_ROLE')
  @ApiOperation({ summary: 'Revoke a role from an account (blocked if it would remove the last DOCTOR) — يُستخدم من: لوحة تحكم الطاقم' })
  revoke(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.accountRolesService.revoke(accountId, roleId);
  }
}