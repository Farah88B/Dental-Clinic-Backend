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
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { HasPagination, PaginationQuery } from 'src/common/pagination/pagination-query-params.decorator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { TreatmentPlanTemplatesService } from '../services/treatment-plan-templates.service';
import { CreateTreatmentPlanTemplateDto } from '../dto/create-treatment-plan-template.dto';
import { UpdateTreatmentPlanTemplateDto } from '../dto/update-treatment-plan-template.dto';
import { TreatmentPlanTemplateResponseDto } from '../dto/treatment-plan-template-response.dto';

@ApiTags('Treatment Plan Templates (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treatment-plan-templates')
export class TreatmentPlanTemplatesController {
  constructor(
    private readonly planTemplatesService: TreatmentPlanTemplatesService,
  ) {}

  @Get()
  @HasPagination()
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({
    summary: 'List treatment plan templates — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiPaginatedResponse(TreatmentPlanTemplateResponseDto)
  list(
    @PaginationQuery() pagination: PaginationDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.planTemplatesService.list(pagination, preferredLanguage);
  }

  @Get(':id')
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({
    summary: 'Get a treatment plan template by id — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentPlanTemplateResponseDto)
  getById(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.planTemplatesService.getById(id, preferredLanguage);
  }

  @Post()
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('CREATE_TREATMENT_PLAN_TEMPLATE')
  @ApiOperation({
    summary: 'Create a treatment plan template — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentPlanTemplateResponseDto, 201)
  create(
    @Body() dto: CreateTreatmentPlanTemplateDto,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.planTemplatesService.create(dto, accountId, preferredLanguage);
  }

  @Patch(':id')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('UPDATE_TREATMENT_PLAN_TEMPLATE')
  @ApiOperation({
    summary: 'Update a treatment plan template (nameAr/nameEn only) — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentPlanTemplateResponseDto)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTreatmentPlanTemplateDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.planTemplatesService.update(id, dto, preferredLanguage);
  }

  @Delete(':id')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('DELETE_TREATMENT_PLAN_TEMPLATE')
  @ApiOperation({
    summary: 'Soft-delete a treatment plan template (isActive=false) — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentPlanTemplateResponseDto)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.planTemplatesService.archive(id, preferredLanguage);
  }
}
