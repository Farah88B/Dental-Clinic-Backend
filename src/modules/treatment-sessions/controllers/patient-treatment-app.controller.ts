import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RateTreatmentSessionDto } from '../dto/rate-treatment-session.dto';
import { TreatmentSessionResponseDto } from '../dto/treatment-session-response.dto';
import {
  ListPatientMedicalArchiveQueryDto,
  ListPatientPlanSessionFilesQueryDto,
  ListPatientTreatmentSessionsQueryDto,
} from '../dto/patient-treatment-query.dto';
import {
  PatientMedicalArchiveItemResponseDto,
  PatientPlanSessionFilesResponseDto,
  PatientTreatmentPlanDetailResponseDto,
  PatientTreatmentPlanResponseDto,
  PatientTreatmentSessionResponseDto,
} from '../dto/patient-treatment-response.dto';
import { PatientHomeResponseDto } from '../dto/patient-home-response.dto';
import { PatientTreatmentService } from '../services/patient-treatment.service';

@ApiTags('Patients - Mobile App Treatment')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('treatment/patients')
export class PatientTreatmentAppController {
  constructor(
    private readonly patientTreatmentService: PatientTreatmentService,
  ) {}

  @Get(':patientId/home')
  @ApiOperation({
    summary:
      'Patient home: pending rating with session if eligible — يُستخدم من: تطبيق المريض',
  })
  @ApiBaseResponse(PatientHomeResponseDto)
  home(
    @Param('patientId', ParseIntPipe) patientId: number,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.patientTreatmentService.getHome(
      patientId,
      accountId,
      preferredLanguage,
    );
  }

  @Post(':patientId/treatment-sessions/:sessionId/rate')
  @AuditAction('RATE_TREATMENT_SESSION')
  @ApiOperation({ summary: 'Rate a completed treatment session for a patient' })
  @ApiBaseResponse(TreatmentSessionResponseDto, 201)
  rateSession(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
    @Body() dto: RateTreatmentSessionDto,
  ) {
    return this.patientTreatmentService.rateSession(
      patientId,
      sessionId,
      accountId,
      dto,
      preferredLanguage,
    );
  }

  @Get(':patientId/treatment-plans')
  @ApiOperation({
    summary:
      'List patient treatment plan summaries (no nested sessions) — يُستخدم من: تطبيق المريض',
  })
  @ApiBaseResponse(PatientTreatmentPlanResponseDto)
  listPlans(
    @Param('patientId', ParseIntPipe) patientId: number,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.patientTreatmentService.listPlans(
      patientId,
      accountId,
      preferredLanguage,
    );
  }

  @Get(':patientId/treatment-plans/:planId/session-files')
  @ApiOperation({
    summary:
      'List prescriptions and files for plan sessions — يُستخدم من: تطبيق المريض',
  })
  @ApiBaseResponse(PatientPlanSessionFilesResponseDto)
  listPlanSessionFiles(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('planId', ParseIntPipe) planId: number,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
    @Query() query: ListPatientPlanSessionFilesQueryDto,
  ) {
    return this.patientTreatmentService.listPlanSessionFiles(
      patientId,
      planId,
      { kind: 'patient', accountId },
      query.type,
      preferredLanguage,
    );
  }

  @Get(':patientId/treatment-plans/:planId')
  @ApiOperation({
    summary:
      'Get patient treatment plan detail with sessions — يُستخدم من: تطبيق المريض',
  })
  @ApiBaseResponse(PatientTreatmentPlanDetailResponseDto)
  getPlan(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Param('planId', ParseIntPipe) planId: number,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.patientTreatmentService.getPlan(
      patientId,
      planId,
      accountId,
      preferredLanguage,
    );
  }

  @Get(':patientId/treatment-sessions/for-booking')
  @ApiOperation({
    summary:
      'List sessions available to book an appointment (PENDING; use canBook) — يُستخدم من: تطبيق المريض',
  })
  @ApiBaseResponse(PatientTreatmentSessionResponseDto)
  listSessionsForBooking(
    @Param('patientId', ParseIntPipe) patientId: number,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.patientTreatmentService.listSessionsForBooking(
      patientId,
      { kind: 'patient', accountId },
      preferredLanguage,
    );
  }

  @Get(':patientId/treatment-sessions')
  @ApiOperation({
    summary:
      'List patient sessions by status (COMPLETED | PENDING | BOOKED) — يُستخدم من: تطبيق المريض',
  })
  @ApiBaseResponse(PatientTreatmentSessionResponseDto)
  listSessions(
    @Param('patientId', ParseIntPipe) patientId: number,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
    @Query() query: ListPatientTreatmentSessionsQueryDto,
  ) {
    return this.patientTreatmentService.listSessions(
      patientId,
      { kind: 'patient', accountId },
      query.status,
      preferredLanguage,
    );
  }

  @Get(':patientId/medical-archive')
  @ApiOperation({
    summary:
      'List patient X-rays and medical reports — يُستخدم من: تطبيق المريض',
  })
  @ApiBaseResponse(PatientMedicalArchiveItemResponseDto)
  listMedicalArchive(
    @Param('patientId', ParseIntPipe) patientId: number,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
    @Query() query: ListPatientMedicalArchiveQueryDto,
  ) {
    return this.patientTreatmentService.listMedicalArchive(
      patientId,
      { kind: 'patient', accountId },
      query.type,
      preferredLanguage,
    );
  }
}
