import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { CreateDashboardPatientDto } from '../dto/create-dashboard-patient.dto';
import { PatientResponseDto } from '../dto/patient-response.dto';
import { PatientService } from '../services/patient.service';

@ApiTags('Patients - Staff Dashboard')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard/patients')
export class PatientDashboardController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @RequirePermission('manage_patients')
  @AuditAction('CREATE_PATIENT')
  @ApiOperation({ summary: 'Create a patient profile - Used by: Staff Dashboard' })
  @ApiBaseResponse(PatientResponseDto, 201)
  create(@Body() dto: CreateDashboardPatientDto, @ReqUser('id') authenticatedAccountId: number) {
    return this.patientService.create(dto, {
      source: 'DASHBOARD',
      accountId: dto.accountId ?? null,
      authenticatedAccountId,
      allowDuplicateCreation: dto.allowDuplicateCreation ?? false,
    });
  }
}
