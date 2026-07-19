import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { HasPagination, PaginationQuery } from 'src/common/pagination/pagination-query-params.decorator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleResponseDto } from '../dto/role-response.dto';
import { AssignPermissionsDto } from 'src/modules/permissions/dto/assign-permissions.dto';

@ApiTags('RBAC (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
  @Get()
  @HasPagination()
  @RequirePermission('manage_roles')
  @ApiOperation({ summary: 'List roles — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiPaginatedResponse(RoleResponseDto)
  list(@PaginationQuery() pagination: PaginationDto) {
    return this.rolesService.list(pagination);
  }

  @Get(':id')
  @RequirePermission('manage_roles')
  @ApiOperation({ summary: 'Get a role by id — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(RoleResponseDto)
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getById(id);
  }

  @Post()
  @RequirePermission('manage_roles')
  @AuditAction('CREATE_ROLE')
  @ApiOperation({ summary: 'Create a new role — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(RoleResponseDto, 201)
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('manage_roles')
  @AuditAction('UPDATE_ROLE')
  @ApiOperation({ summary: 'Update a role — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(RoleResponseDto)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('manage_roles')
  @AuditAction('DELETE_ROLE')
  @ApiOperation({ summary: 'Delete a role (fails with 409 if still assigned) — يُستخدم من: لوحة تحكم الطاقم' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.delete(id);
  }

  @Patch(':id/permissions')
  @RequirePermission('assign_role_permissions')
  @AuditAction('ASSIGN_ROLE_PERMISSIONS')
  @ApiOperation({ summary: 'Replace the full permission set for a role — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(RoleResponseDto)
  assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, dto);
  }
}