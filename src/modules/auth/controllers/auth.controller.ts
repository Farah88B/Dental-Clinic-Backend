import { Body, Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { VerifyRegistrationOtpDto } from '../dto/verify-registration-otp.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordWithOtpDto } from '../dto/reset-password-with-otp.dto';
import { StartChangePhoneDto } from '../dto/start-change-phone.dto';
import { ConfirmChangePhoneDto } from '../dto/confirm-change-phone.dto';
import { ToggleBiometricDto } from '../dto/toggle-biometric.dto';
import { ActivateInvitationDto } from '../dto/activate-invitation.dto';
import { ActivationRequiredDto } from '../dto/activation-required.dto';
import { TokenPairDto } from '../dto/token-pair.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CompleteActivationDto } from '../dto/complete-activation.dto';
import { CreatePatientAccountDto } from '../dto/create-patient-account.dto';
import { SetLanguageDto } from '../dto/update-preferences.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiBaseUnionResponse } from 'src/common/decorators/api-base-union-response.decorator';

// ─── Auth - Shared (App + Web) ────────────────────────────

@ApiTags('Auth - Shared')
@Controller('auth')
export class AuthSharedController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login — يُستخدم من: تطبيق المريض + لوحة تحكم الطاقم. Returns tokens if ACTIVE, or {activationRequired, temporaryToken} if INVITED' })
  @ApiBaseUnionResponse(TokenPairDto, ActivationRequiredDto)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a valid refresh token for a new token pair — مشترك' })
  @ApiBaseResponse(TokenPairDto)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout (stateless — client discards tokens) — مشترك' })
  logout() {
    return this.authService.logout();
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change password for logged-in ACTIVE account (requires current password) — مشترك' })
  changePassword(@ReqUser('id') accountId: number, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(accountId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Patch('language')
  @ApiOperation({ summary: 'Update the authenticated account language — مشترك' })
  setLanguage(@ReqUser('id') accountId: number, @Body() dto: SetLanguageDto) {
    return this.authService.setLanguage(accountId, dto);
  }
}

// ─── Auth - Patient App ───────────────────────────────────

@ApiTags('Auth - Patient App')
@Controller('auth')
export class AuthPatientAppController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Step 1: create account (PENDING_ACTIVATION) and send OTP — يُستخدم من: تطبيق المريض' })
  registerStart(@Body() dto: RegisterDto) {
    return this.authService.registerStart(dto);
  }

  @Public()
  @Post('register/verify')
  @ApiOperation({ summary: 'Step 2: verify OTP, activate account, get tokens — يُستخدم من: تطبيق المريض' })
  @ApiBaseResponse(TokenPairDto)
  registerVerify(@Body() dto: VerifyRegistrationOtpDto) {
    return this.authService.registerVerify(dto);
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password-reset OTP — يُستخدم من: تطبيق المريض' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using the OTP received — يُستخدم من: تطبيق المريض' })
  resetPassword(@Body() dto: ResetPasswordWithOtpDto) {
    return this.authService.resetPasswordWithOtp(dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('change-phone/start')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Step 1: request OTP to the NEW phone number — يُستخدم من: تطبيق المريض' })
  startChangePhone(@ReqUser('id') accountId: number, @Body() dto: StartChangePhoneDto) {
    return this.authService.startChangePhone(accountId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('change-phone/confirm')
  @ApiOperation({ summary: 'Step 2: confirm OTP and apply the new phone number — يُستخدم من: تطبيق المريض' })
  confirmChangePhone(@ReqUser('id') accountId: number, @Body() dto: ConfirmChangePhoneDto) {
    return this.authService.confirmChangePhone(accountId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('biometric')
  @ApiOperation({ summary: 'Enable/disable biometric login flag — يُستخدم من: تطبيق المريض' })
  toggleBiometric(@ReqUser('id') accountId: number, @Body() dto: ToggleBiometricDto) {
    return this.authService.toggleBiometric(accountId, dto);
  }

  @Public()
  @Post('complete-activation')
  @ApiOperation({ summary: 'Set password for an INVITED account and activate it — يُستخدم من: تطبيق المريض (بعد login بـ temporaryToken)' })
  @ApiBaseResponse(TokenPairDto)
  completeActivation(@Body() dto: CompleteActivationDto) {
    return this.authService.completeActivation(dto);
  }
}

// ─── Auth - Staff/Web Only ────────────────────────────────

@ApiTags('Auth - Staff/Web Only')
@Controller('auth')
export class AuthStaffController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('invitation/start')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  @Post('patients/:patientId/create-account')
  @RequirePermission('link_patient_account')
  @AuditAction('CREATE_PATIENT_ACCOUNT')
  @ApiParam({ name: 'patientId', type: Number })
  @ApiOperation({ summary: 'Secretary creates account for an in-clinic patient (INVITED, temp password) — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(TokenPairDto, 201)
  createPatientAccount(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: CreatePatientAccountDto,
  ) {
    // TODO: Epic 5 — ربط الـ accountId بجدول Patient بعد إنشائه
    return this.authService.createPatientAccount(patientId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('patients/:patientId/invite-account')
  @RequirePermission('link_patient_account')
  @AuditAction('INVITE_PATIENT_ACCOUNT')
  @ApiParam({ name: 'patientId', type: Number })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send OTP to existing patient to link their medical record to an account — يُستخدم من: لوحة تحكم الطاقم' })
  // TODO: Epic 5 — ربط الـ accountId بجدول Patient بعد التفعيل
  // metadata على OtpVerification تحمل linkPatientId
  invitePatientAccount(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: ForgotPasswordDto,
  ) {
    return this.authService.startInvitationActivation(dto.phone);
  }
}