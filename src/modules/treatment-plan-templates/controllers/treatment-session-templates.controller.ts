import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { TreatmentSessionTemplatesService } from '../services/treatment-session-templates.service';
import { UpdateTreatmentSessionTemplateDto } from '../dto/update-treatment-session-template.dto';
import { TreatmentSessionTemplateResponseDto } from '../dto/treatment-session-template-response.dto';

@ApiTags('Treatment Session Templates (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('session-templates')
export class TreatmentSessionTemplatesController {
  constructor(
    private readonly sessionTemplatesService: TreatmentSessionTemplatesService,
  ) {}

  @Patch(':id')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('UPDATE_TREATMENT_SESSION_TEMPLATE')
  @ApiOperation({
    summary: 'Update a session template — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentSessionTemplateResponseDto)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTreatmentSessionTemplateDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionTemplatesService.update(id, dto, preferredLanguage);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('DELETE_TREATMENT_SESSION_TEMPLATE')
  @ApiOperation({
    summary: 'Soft-delete a session template (isActive=false) — يُستخدم من: لوحة تحكم الطاقم',
  })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.sessionTemplatesService.delete(id);
  }
}
