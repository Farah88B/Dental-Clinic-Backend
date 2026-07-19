import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { PermissionsService } from '../services/permissions.service';
import { PermissionResponseDto } from '../dto/permission-response.dto';

@ApiTags('RBAC (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission('manage_roles')
  @ApiOperation({ summary: 'List all available permissions — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(PermissionResponseDto)
  list() {
    return this.permissionsService.list();
  }
}