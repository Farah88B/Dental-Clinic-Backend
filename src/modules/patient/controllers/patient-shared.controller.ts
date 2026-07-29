import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PatientFormSchemaResponseDto } from '../dto/patient-form-schema-response.dto';
import { PatientService } from '../services/patient.service';

@ApiTags('Patients - Shared')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientSharedController {
  constructor(private readonly patientService: PatientService) {}

  @Get('form/schema')
  @ApiOperation({ summary: 'Get the active patient form schema - Used by: Patient Mobile App + Staff Dashboard' })
  @ApiBaseResponse(PatientFormSchemaResponseDto)
  getFormSchema(@ReqUser('preferredLanguage') language: 'ar' | 'en') {
    return this.patientService.getFormSchema(language);
  }
}
