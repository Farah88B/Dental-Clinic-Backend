import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';
import { PatientResponseDto } from '../dto/patient-response.dto';
import { PatientMyResponseDto } from '../dto/patient-my-response.dto';
import { PatientDetailResponseDto } from '../dto/patient-detail-response.dto';
import { PatientService } from '../services/patient.service';

@ApiTags('Patients - Mobile App')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientAppController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @AuditAction('CREATE_PATIENT')
  @ApiOperation({
    summary: 'Create a patient profile - Used by: Patient Mobile App',
  })
  @ApiBaseResponse(PatientResponseDto, 201)
  create(@Body() dto: CreatePatientDto, @ReqUser('id') accountId: number) {
    return this.patientService.create(dto, {
      source: 'APP',
      accountId,
      authenticatedAccountId: accountId,
      allowDuplicateCreation: false,
    });
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get my patient profiles - Used by: Patient Mobile App',
  })
  @ApiBaseResponse(PatientMyResponseDto)
  findMy(@ReqUser('id') accountId: number) {
    return this.patientService.findMyPatients(accountId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get patient details - Used by: Patient Mobile App',
  })
  @ApiBaseResponse(PatientDetailResponseDto)
  findDetail(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    return this.patientService.findPatientDetail(
      id,
      'APP',
      user.id,
      user.preferredLanguage,
    );
  }

  @Patch(':id')
  @AuditAction('UPDATE_PATIENT_INFO')
  @ApiOperation({
    summary: 'Update patient profile - Used by: Patient Mobile App',
  })
  @ApiBaseResponse(PatientResponseDto)
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.patientService.update(id, dto, {
      source: 'APP',
      authenticatedAccountId: accountId,
    });
  }
}
