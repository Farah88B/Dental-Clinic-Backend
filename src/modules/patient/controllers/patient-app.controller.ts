import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { PatientResponseDto } from '../dto/patient-response.dto';
import { PatientService } from '../services/patient.service';

@ApiTags('Patients - Mobile App')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientAppController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @AuditAction('CREATE_PATIENT')
  @ApiOperation({ summary: 'Create a patient profile - Used by: Patient Mobile App' })
  @ApiBaseResponse(PatientResponseDto, 201)
  create(@Body() dto: CreatePatientDto, @ReqUser('id') accountId: number) {
    return this.patientService.create(dto, {
      source: 'APP',
      accountId,
      authenticatedAccountId: accountId,
      allowDuplicateCreation: false,
    });
  }
}
