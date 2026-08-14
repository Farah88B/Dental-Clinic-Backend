import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
// import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { VerifyRegistrationOtpDto } from '../dto/verify-registration-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyResetOtpDto } from '../dto/verify-reset-otp.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ResetPasswordTokenDto } from '../dto/reset-password-token.dto';
import { StartChangePhoneDto } from '../dto/start-change-phone.dto';
import { ConfirmChangePhoneDto } from '../dto/confirm-change-phone.dto';
import { ToggleBiometricDto } from '../dto/toggle-biometric.dto';
import { CompleteActivationDto } from '../dto/complete-activation.dto';
import { TokenPairDto } from '../dto/token-pair.dto';

@ApiTags('Auth - Patient App')
@Controller('auth')
export class AuthPatientAppController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  // @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  // @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password-reset OTP — يُستخدم من: تطبيق المريض' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('verify-reset-otp')
  // @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify reset OTP and return a short-lived reset token — يُستخدم من: تطبيق المريض' })
  @ApiBaseResponse(ResetPasswordTokenDto)
  verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using a short-lived reset token — يُستخدم من: تطبيق المريض' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('change-phone/start')
  // @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
