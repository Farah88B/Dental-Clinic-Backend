import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, OtpType } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { hashPassword, comparePassword } from 'src/common/utils/hash.utils';
import { AUTH_ERROR_CODES } from 'src/common/constants/auth.constants';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { RegisterDto } from '../dto/register.dto';
import { VerifyRegistrationOtpDto } from '../dto/verify-registration-otp.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyResetOtpDto } from '../dto/verify-reset-otp.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { StartChangePhoneDto } from '../dto/start-change-phone.dto';
import { ConfirmChangePhoneDto } from '../dto/confirm-change-phone.dto';
import { ToggleBiometricDto } from '../dto/toggle-biometric.dto';
import { AccountRolesService } from 'src/modules/account-roles/services/account-roles.service';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants'
import { TokenPairDto } from '../dto/token-pair.dto';
import { ActivateInvitationDto } from '../dto/activate-invitation.dto';
import { CompleteActivationDto } from '../dto/complete-activation.dto';
import { ActivationRequiredDto } from '../dto/activation-required.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { SetLanguageDto } from '../dto/update-preferences.dto';
const PATIENT_ROLE_CODE = 'PATIENT';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly accountRolesService: AccountRolesService,
  ) {}

  // Start self-registration by creating or refreshing a pending account and sending OTP.
async registerStart(dto: RegisterDto): Promise<{ accountId: number }> {
  const existing = await this.prisma.account.findUnique({ where: { phone: dto.phone } });

  if (existing) {
    const password = await hashPassword(dto.password); // allow changing password on retry
    await this.prisma.account.update({
      where: { id: existing.id },
      data: {
        password,
        preferredLanguage: (dto.language ?? 'ar').toUpperCase() as 'AR' | 'EN',
      },
    });
    await this.otpService.send(existing.id, dto.phone, OtpType.REGISTER);
    return { accountId: existing.id };
  }

  const password = await hashPassword(dto.password);
  const account = await this.prisma.account.create({
    data: {
      phone: dto.phone,
      password,
      status: 'PENDING_ACTIVATION',
      preferredLanguage: (dto.language ?? 'ar').toUpperCase() as 'AR' | 'EN',
    },
  });
  await this.otpService.send(account.id, dto.phone, OtpType.REGISTER);
  return { accountId: account.id };
}

  // Step 2/2: verify OTP, activate the account, assign the PATIENT role.
  // Finish self-registration after OTP verification and grant the PATIENT role.
  async registerVerify(dto: VerifyRegistrationOtpDto) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { phone: dto.phone },
    });

    if (account.status === 'ACTIVE') {
      return this.buildAuthenticatedResponse(account.id, account.phone, AccountStatus.ACTIVE);
    }

    await this.otpService.verify(account.id, OtpType.REGISTER, dto.code);

    const patientRole = await this.prisma.role.findUniqueOrThrow({
      where: { code: PATIENT_ROLE_CODE },
    });

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: account.id },
        data: { status: 'ACTIVE', phoneVerifiedAt: new Date() },
      }),
      this.prisma.accountRole.create({
        data: { accountId: account.id, roleId: patientRole.id },
      }),
    ]);

    return this.buildAuthenticatedResponse(account.id, account.phone, AccountStatus.ACTIVE);
  }


  // Authenticate credentials and return either tokens or activation instructions.
  async login(dto: LoginDto): Promise<TokenPairDto> {
    const account = await this.prisma.account.findUnique({ where: { phone: dto.phone } });

    if (!account || !account.password) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    }

    const passwordMatches = await comparePassword(dto.password, account.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (account.status === 'INVITED') {
      const temporaryToken = this.tokenService.issueActivationToken(account.id);
        return new TokenPairDto({
        activationRequired: true,
        temporaryToken,
      });
    }

    if (account.status !== 'ACTIVE') {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    }

    return this.buildAuthenticatedResponse(account.id, account.phone, account.status);
  }


    // Activate an invited account using the temporary activation token.
  async completeActivation(dto: CompleteActivationDto) {
    let accountId: number;
    try {
      accountId = this.tokenService.verifyActivationToken(dto.temporaryToken);
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

    if (account.status === 'ACTIVE') {
      return this.buildAuthenticatedResponse(account.id, account.phone, AccountStatus.ACTIVE);
    }

    if (account.status !== 'INVITED') {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    const password = await hashPassword(dto.newPassword);
    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: { password, status: 'ACTIVE' },
    });

    return this.buildAuthenticatedResponse(updated.id, updated.phone, updated.status);
  }

     
  // Build the standard authenticated response with tokens and account status.
  private async buildAuthenticatedResponse(accountId: number, phone: string, status: AccountStatus) {
    const roles = await this.accountRolesService.getAuthenticatedAccountPayload(accountId);
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId }, select: { preferredLanguage: true } });
    const tokenPair = this.tokenService.issueTokenPair({ id: accountId, phone, preferredLanguage: account.preferredLanguage.toLowerCase() as 'ar' | 'en', roles }, status);
    return new TokenPairDto({ ...tokenPair, accountStatus: status });
  }

  // Exchange a valid refresh token for a new authenticated response.
  async refresh(dto: RefreshTokenDto) {
    let payload: { sub: number };
    try {
      payload = this.tokenService.verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    const account = await this.prisma.account.findUnique({ where: { id: payload.sub } });
    if (!account || account.status !== 'ACTIVE') {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    return this.buildAuthenticatedResponse(account.id, account.phone, account.status);
  }


  async logout(): Promise<void> {
    return;
  }
  
  // Send a reset-password OTP only when the phone exists.
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { phone: dto.phone } });
    if (!account) return;

    await this.otpService.send(account.id, dto.phone, OtpType.RESET_PASSWORD);
  }

  // Verify the reset OTP and return a short-lived reset token.
  async verifyResetOtp(dto: VerifyResetOtpDto): Promise<{ resetToken: string }> {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { phone: dto.phone } });

    await this.otpService.verify(account.id, OtpType.RESET_PASSWORD, dto.code);

    return {
      resetToken: this.tokenService.issueResetPasswordToken(account.id),
    };
  }

  // Set the new password using the verified reset token.
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    let accountId: number;

    try {
      accountId = this.tokenService.verifyResetPasswordToken(dto.resetToken);
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    const password = await hashPassword(dto.newPassword);
    await this.prisma.account.update({ where: { id: accountId }, data: { password } });
  }

  // Send an OTP to the new phone number before applying the change.
  async startChangePhone(accountId: number, dto: StartChangePhoneDto): Promise<void> {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

    if (account.phone === dto.newPhone) {
      throw new BadRequestException(AUTH_ERROR_CODES.NEW_PHONE_SAME_AS_CURRENT);
    }

    const code = await this.otpService.sendWithMetadata(
      accountId,
      dto.newPhone,
      OtpType.CHANGE_PHONE,
      { newPhone: dto.newPhone },
    );
    //return code;
  }

  // Verify the phone-change OTP and update the account phone.
  async confirmChangePhone(accountId: number, dto: ConfirmChangePhoneDto): Promise<void> {
    const otp = await this.otpService.verifyAndReturnMetadata(
      accountId,
      OtpType.CHANGE_PHONE,
      dto.code,
    );
    const newPhone = (otp.metadata as { newPhone: string }).newPhone;
    await this.prisma.account.update({ where: { id: accountId }, data: { phone: newPhone } });
  }

  // Enable or disable biometric login for the current account.
  async toggleBiometric(accountId: number, dto: ToggleBiometricDto): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { biometricEnabled: dto.enabled },
    });
  }

  // Start activation for an invited staff account by sending an OTP.
  async startInvitationActivation(phone: string): Promise<void> {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { phone } });
    if (account.status !== 'INVITED') {
      throw new BadRequestException('ACCOUNT_NOT_INVITED');
    }
    await this.otpService.send(account.id, phone, OtpType.ACCOUNT_ACTIVATION);
  }

  // Complete activation for staff only
  async activateInvitation(dto: ActivateInvitationDto) {
      const account = await this.prisma.account.findUniqueOrThrow({ where: { phone: dto.phone } });
      if (account.status !== 'INVITED') {
        throw new BadRequestException('ACCOUNT_NOT_INVITED');
      }

      await this.otpService.verify(account.id, OtpType.ACCOUNT_ACTIVATION, dto.code);

      const password = await hashPassword(dto.password);
      await this.prisma.account.update({
        where: { id: account.id },
        data: { password, status: 'ACTIVE', phoneVerifiedAt: new Date() },
      });

        return this.buildAuthenticatedResponse(account.id, account.phone, AccountStatus.ACTIVE);
      }

   
  // Change the password for the currently logged-in account.
  async changePassword(accountId: number, dto: ChangePasswordDto): Promise<void> {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

    if (!account.password) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    }

    const passwordMatches = await comparePassword(dto.currentPassword, account.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    }

    const password = await hashPassword(dto.newPassword);
    await this.prisma.account.update({
      where: { id: accountId },
      data: { password },
    });
  }

  // Persist the user's preferred UI language.
  async setLanguage(accountId: number, dto: SetLanguageDto) {
    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        preferredLanguage: dto.language.toUpperCase() as 'AR' | 'EN',
      },
      select: { preferredLanguage: true },
    });
  }

}