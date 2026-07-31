import { Body, Controller, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { AuthService } from '../services/auth.service';
import { PatientAccountService } from '../services/patient-account.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ActivateInvitationDto } from '../dto/activate-invitation.dto';
import { CreatePatientAccountDto } from '../dto/create-patient-account.dto';
import { LinkPatientAccountDto } from '../dto/link-patient-account.dto';
import { RegeneratePatientPasswordResponseDto } from '../dto/regenerate-patient-password-response.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { TokenPairDto } from '../dto/token-pair.dto';

@ApiTags('Auth - Staff/Web Only')
@Controller('auth')
export class AuthStaffController {
  constructor(
    private readonly authService: AuthService,
    private readonly patientAccountService: PatientAccountService,
  ) {}

  @Public()
  @Post('invitation/start')
  @ApiOperation({ summary: 'Send OTP to an invited (staff) account to activate it — يُستخدم من: لوحة تحكم الطاقم' })
  startInvitationActivation(@Body() dto: ForgotPasswordDto) {
    return this.authService.startInvitationActivation(dto.phone);
  }

  @Public()
  @Post('invitation/activate')
  @ApiOperation({ summary: 'Set password + activate an invited staff account — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(TokenPairDto)
  activateInvitation(@Body() dto: ActivateInvitationDto) {
    return this.authService.activateInvitation(dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('patients/:patientId/account')
  @RequirePermission('create_patient')
  @AuditAction('CREATE_PATIENT_ACCOUNT')
  @ApiParam({ name: 'patientId', type: Number })
  @ApiOperation({ summary: 'Create a new account for this patient, replacing any current linked account — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(RegeneratePatientPasswordResponseDto, 201)
  createPatientAccount(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: CreatePatientAccountDto,
  ) {
    return this.patientAccountService.createPatientAccount(patientId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put('patients/:patientId/account')
  @RequirePermission('link_patient_account')
  @AuditAction('INVITE_PATIENT_ACCOUNT')
  @ApiParam({ name: 'patientId', type: Number })
  @ApiOperation({ summary: 'Link or transfer the patient to an existing account by accountId — يُستخدم من: لوحة تحكم الطاقم' })
  invitePatientAccount(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: LinkPatientAccountDto,
  ) {
    return this.patientAccountService.linkPatientAccount(patientId, dto.accountId);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('patients/:patientId/account/regenerate-password')
  @RequirePermission('create_patient')
  @AuditAction('REGENERATE_PATIENT_TEMP_PASSWORD')
  @ApiParam({ name: 'patientId', type: Number })
  @ApiOperation({
    summary:
      'Regenerate temporary password for an invited patient account - يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(RegeneratePatientPasswordResponseDto)
  regenerateTempPassword(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.patientAccountService.regeneratePatientTempPassword(patientId);
  }
}
