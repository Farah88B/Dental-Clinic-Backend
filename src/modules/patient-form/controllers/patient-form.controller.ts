import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { PatientFormService } from '../services/patient-form.service';
import { PatientFormFieldResponseDto } from '../dto/patient-form-field-response.dto';
import { CreatePatientFormFieldDto } from '../dto/create-patient-form-field.dto';
import { UpdatePatientFormFieldDto } from '../dto/update-patient-form-field.dto';
import { TogglePatientFormFieldStatusDto } from '../dto/toggle-patient-form-field-status.dto';
import { ReorderPatientFormFieldsDto } from '../dto/reorder-patient-form-fields.dto';

@ApiTags('Patient Form Fields — Staff/Web Only')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('patient-form-fields')
export class PatientFormController {
  constructor(private readonly patientFormService: PatientFormService) {}

  @Get()
  @HasPagination()
  @RequirePermission('manage_patient_form_fields')
  @ApiOperation({ summary: 'List patient form fields — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiPaginatedResponse(PatientFormFieldResponseDto)
  list(
    @PaginationQuery() pagination: PaginationDto,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const filters = {
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && { search }),
    };
    return this.patientFormService.list(pagination, filters);
  }

  @Get(':id')
  @RequirePermission('manage_patient_form_fields')
  @ApiOperation({ summary: 'Get a patient form field by id — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(PatientFormFieldResponseDto)
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.patientFormService.getById(id);
  }

  @Patch('reorder')
  @RequirePermission('manage_patient_form_fields')
  @AuditAction('REORDER_PATIENT_FORM_FIELDS')
  @ApiOperation({ summary: 'Reorder patient form fields — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(PatientFormFieldResponseDto)
  reorder(@Body() dto: ReorderPatientFormFieldsDto) {
    return this.patientFormService.reorder(dto);
  }

  @Post()
  @RequirePermission('manage_patient_form_fields')
  @AuditAction('CREATE_PATIENT_FORM_FIELD')
  @ApiOperation({ summary: 'Create a patient form field — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(PatientFormFieldResponseDto, 201)
  create(@Body() dto: CreatePatientFormFieldDto, @ReqUser('id') createdByAccountId: number) {
    return this.patientFormService.create(dto, createdByAccountId);
  }

  @Patch(':id')
  @RequirePermission('manage_patient_form_fields')
  @AuditAction('UPDATE_PATIENT_FORM_FIELD')
  @ApiOperation({ summary: 'Update a patient form field — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(PatientFormFieldResponseDto)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatientFormFieldDto) {
    return this.patientFormService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('manage_patient_form_fields')
  @AuditAction('TOGGLE_PATIENT_FORM_FIELD_STATUS')
  @ApiOperation({ summary: 'Toggle patient form field status — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(PatientFormFieldResponseDto)
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TogglePatientFormFieldStatusDto,
  ) {
    return this.patientFormService.toggleStatus(id, dto);
  }
}