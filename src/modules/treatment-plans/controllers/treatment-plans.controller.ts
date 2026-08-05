import {
  Body,
  Controller,
  // Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { HasPagination, PaginationQuery } from 'src/common/pagination/pagination-query-params.decorator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { TreatmentPlansService } from '../services/treatment-plans.service';
import { CreateTreatmentPlanDto } from '../dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from '../dto/update-treatment-plan.dto';
import { TreatmentPlanResponseDto } from '../dto/treatment-plan-response.dto';

@ApiTags('Treatment Plans (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly plansService: TreatmentPlansService) {}

  @Get()
  @HasPagination()
  @RequirePermission('create_treatment_plan')
  @ApiQuery({ name: 'patientId', required: false, type: Number })
  @ApiOperation({ summary: 'List treatment plans — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiPaginatedResponse(TreatmentPlanResponseDto)
  list(
    @PaginationQuery() pagination: PaginationDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.plansService.list(
      pagination,
      patientId ? Number(patientId) : undefined,
      preferredLanguage,
    );
  }

  @Get(':id')
  @RequirePermission('create_treatment_plan')
  @ApiOperation({ summary: 'Get a treatment plan — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(TreatmentPlanResponseDto)
  getById(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.plansService.getById(id, preferredLanguage);
  }

  @Post()
  @RequirePermission('create_treatment_plan')
  @AuditAction('CREATE_TREATMENT_PLAN')
  @ApiOperation({
    summary: 'Create a treatment plan (manual or from template) — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentPlanResponseDto, 201)
  create(
    @Body() dto: CreateTreatmentPlanDto,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.plansService.create(dto, accountId, preferredLanguage);
  }
/*
  @Patch(':id')
  @RequirePermission('create_treatment_plan')
  @AuditAction('UPDATE_TREATMENT_PLAN')
  @ApiOperation({
    summary: 'Cancel a treatment plan (status=CANCELLED only) — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(TreatmentPlanResponseDto)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTreatmentPlanDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.plansService.update(id, dto, preferredLanguage);
  }
*/
  // DELETE soft-archive disabled — cancel via PATCH status=CANCELLED instead.
  // @Delete(':id')
  // @RequirePermission('create_treatment_plan')
  // @AuditAction('DELETE_TREATMENT_PLAN')
  // @ApiOperation({ summary: 'Soft-delete a treatment plan — يُستخدم من: لوحة تحكم الطاقم' })
  // @ApiBaseResponse(TreatmentPlanResponseDto)
  // archive(@Param('id', ParseIntPipe) id: number) {
  //   return this.plansService.archive(id);
  // }
}
