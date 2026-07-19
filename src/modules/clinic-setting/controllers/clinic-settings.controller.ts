import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ClinicSettingsService } from '../services/clinic-settings.service';
import { UpdateClinicSettingsDto } from '../dto/update-clinic-settings.dto';
import { ClinicSettingsResponseDto } from '../dto/clinic-settings-response.dto';

@ApiTags('Clinic Settings')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clinic-settings')
export class ClinicSettingsController {
  constructor(private readonly settingsService: ClinicSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get clinic settings — قراءة: الجميع (تطبيق المريض + لوحة تحكم الطاقم)' })
  @ApiBaseResponse(ClinicSettingsResponseDto)
  get() {
    return this.settingsService.get();
  }

  @Patch()
  @RequirePermission('manage_clinic_settings')
  @AuditAction('UPDATE_CLINIC_SETTINGS')
  @ApiOperation({ summary: 'Update clinic settings — كتابة: الطبيب فقط (يُستخدم من: لوحة تحكم الطاقم)' })
  @ApiBaseResponse(ClinicSettingsResponseDto)
  update(@Body() dto: UpdateClinicSettingsDto, @ReqUser('id') accountId: number) {
    return this.settingsService.update(dto, accountId);
  }
}