import {
  Body,
  Controller,
  Get,
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
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { TreatmentSessionTemplatesService } from '../services/treatment-session-templates.service';
import { CreateTreatmentSessionTemplateDto } from '../dto/create-treatment-session-template.dto';
import { TreatmentSessionTemplateResponseDto } from '../dto/treatment-session-template-response.dto';

@ApiTags('Treatment Session Templates (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treatment-plan-templates/:planTemplateId/session-templates')
export class NestedTreatmentSessionTemplatesController {
  constructor(
    private readonly sessionTemplatesService: TreatmentSessionTemplatesService,
  ) {}

  @Get()
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({
    summary: 'List session templates for a plan template — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentSessionTemplateResponseDto)
  listForPlan(
    @Param('planTemplateId', ParseIntPipe) planTemplateId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionTemplatesService.listForPlan(
      planTemplateId,
      preferredLanguage,
    );
  }

  @Post()
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('CREATE_TREATMENT_SESSION_TEMPLATE')
  @ApiOperation({
    summary: 'Create a session template under a plan template — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentSessionTemplateResponseDto, 201)
  create(
    @Param('planTemplateId', ParseIntPipe) planTemplateId: number,
    @Body() dto: CreateTreatmentSessionTemplateDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionTemplatesService.create(
      planTemplateId,
      dto,
      preferredLanguage,
    );
  }
}
