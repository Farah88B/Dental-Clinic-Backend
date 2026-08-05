import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import {
  ListPatientMedicalArchiveQueryDto,
  ListPatientPlanSessionFilesQueryDto,
  ListPatientTreatmentSessionsQueryDto,
} from '../dto/patient-treatment-query.dto';
import {
  PatientMedicalArchiveItemResponseDto,
  PatientPlanSessionFilesResponseDto,
  PatientTreatmentSessionResponseDto,
} from '../dto/patient-treatment-response.dto';
import { PatientTreatmentService } from '../services/patient-treatment.service';

/**
 * Staff mirrors of patient F4–F10 treatment read APIs (same payloads, permission-gated).
 */
@ApiTags('Patients - Dashboard Treatment Views')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard/patients')
export class PatientTreatmentStaffController {
  constructor(
    private readonly patientTreatmentService: PatientTreatmentService,
  ) {}

  @Get(':patientId/treatment-sessions/for-booking')
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({
    summary:
      'List sessions available to book (PENDING; use canBook) — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(PatientTreatmentSessionResponseDto)
  listSessionsForBooking(
    @Param('patientId', ParseIntPipe) patientId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.patientTreatmentService.listSessionsForBooking(
      patientId,
      { kind: 'staff' },
      preferredLanguage,
    );
  }

  @Get(':patientId/treatment-sessions')
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({
    summary:
      'List patient sessions by status (COMPLETED | PENDING | BOOKED) — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(PatientTreatmentSessionResponseDto)
  listSessions(
    @Param('patientId', ParseIntPipe) patientId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
    @Query() query: ListPatientTreatmentSessionsQueryDto,
  ) {
    return this.patientTreatmentService.listSessions(
      patientId,
      { kind: 'staff' },
      query.status,
      preferredLanguage,
    );
  }

  @Get(':patientId/medical-archive')
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({
    summary:
      'List patient X-rays and medical reports — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(PatientMedicalArchiveItemResponseDto)
  listMedicalArchive(
    @Param('patientId', ParseIntPipe) patientId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
    @Query() query: ListPatientMedicalArchiveQueryDto,
  ) {
    return this.patientTreatmentService.listMedicalArchive(
      patientId,
      { kind: 'staff' },
      query.type,
      preferredLanguage,
    );
  }

  @Get(':patientId/treatment-plans/:planId/session-files')
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({
    summary:
      'List prescriptions and files for plan sessions — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(PatientPlanSessionFilesResponseDto)
  listPlanSessionFiles(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('planId', ParseIntPipe) planId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
    @Query() query: ListPatientPlanSessionFilesQueryDto,
  ) {
    return this.patientTreatmentService.listPlanSessionFiles(
      patientId,
      planId,
      { kind: 'staff' },
      query.type,
      preferredLanguage,
    );
  }
}
