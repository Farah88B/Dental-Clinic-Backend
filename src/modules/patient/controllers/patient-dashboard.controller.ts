import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  HasPagination,
  PaginationQuery,
} from 'src/common/pagination/pagination-query-params.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import type { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import { CreateDashboardPatientDto } from '../dto/create-dashboard-patient.dto';
import { PatientResponseDto } from '../dto/patient-response.dto';
import { PatientListResponseDto } from '../dto/patient-list-response.dto';
import { PatientDetailResponseDto } from '../dto/patient-detail-response.dto';
import { PatientListQueryDto } from '../dto/patient-list-query.dto';
import { PatientService } from '../services/patient.service';

@ApiTags('Patients - Staff Dashboard')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard/patients')
export class PatientDashboardController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @RequirePermission('create_patient')
  @AuditAction('CREATE_PATIENT')
  @ApiOperation({
    summary: 'Create a patient profile - Used by: Staff Dashboard',
  })
  @ApiBaseResponse(PatientResponseDto, 201)
  create(
    @Body() dto: CreateDashboardPatientDto,
    @ReqUser('id') authenticatedAccountId: number,
  ) {
    return this.patientService.create(dto, {
      source: 'DASHBOARD',
      accountId: dto.accountId ?? null,
      authenticatedAccountId,
      allowDuplicateCreation: dto.allowDuplicateCreation ?? false,
    });
  }

  @Get()
  @HasPagination()
  @RequirePermission('view_patients')
  @ApiOperation({
    summary:
      'List patients with pagination, search, and filters - Used by: Staff Dashboard',
  })
  @ApiPaginatedResponse(PatientListResponseDto)
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enumName: 'PatientStatus',
    enum: ['ACTIVE', 'ARCHIVED', 'INACTIVE'],
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    enumName: 'Gender',
    enum: ['MALE', 'FEMALE'],
  })
  @ApiQuery({
    name: 'lastVisitFrom',
    required: false,
    type: String,
    description: 'ISO date string',
  })
  @ApiQuery({
    name: 'lastVisitTo',
    required: false,
    type: String,
    description: 'ISO date string',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['fullName', 'createdAt', 'lastVisitAt', 'medicalRecordNumber'],
  })
  @ApiQuery({ name: 'sortDirection', required: false, enum: ['asc', 'desc'] })
  list(@PaginationQuery() pagination: PatientListQueryDto) {
    return this.patientService.listPatients(pagination);
  }

  @Get(':id')
  @RequirePermission('view_patients')
  @ApiOperation({ summary: 'Get patient details - Used by: Staff Dashboard' })
  @ApiBaseResponse(PatientDetailResponseDto)
  findDetail(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    return this.patientService.findPatientDetail(
      id,
      'DASHBOARD',
      user.id,
      user.preferredLanguage,
    );
  }
}
