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
import { ResetPasswordWithOtpDto } from '../dto/reset-password-with-otp.dto';
import { StartChangePhoneDto } from '../dto/start-change-phone.dto';
import { ConfirmChangePhoneDto } from '../dto/confirm-change-phone.dto';
import { ToggleBiometricDto } from '../dto/toggle-biometric.dto';
import { AccountRolesService } from 'src/modules/account-roles/services/account-roles.service';
import { ConflictException } from '@nestjs/common'
import { ERROR_CODES } from 'src/common/constants/error-codes.constants'
import { TokenPairDto } from '../dto/token-pair.dto';
import { ActivateInvitationDto } from '../dto/activate-invitation.dto';
import { CompleteActivationDto } from '../dto/complete-activation.dto';
import { CreatePatientAccountDto } from '../dto/create-patient-account.dto';
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

  // Step 1/2 of registration: create the Account in PENDING_ACTIVATION and
  // send the OTP. No manual "phone already exists" check — Prisma throws
  // P2002 on create() and PrismaExceptionFilter (Epic 0) turns it into
  // 409 DUPLICATE_VALUE automatically.
// modules/auth/services/auth.service.ts — استبدلي registerStart() بهاد:

async registerStart(dto: RegisterDto): Promise<{ accountId: number }> {
  const existing = await this.prisma.account.findUnique({ where: { phone: dto.phone } });

  if (existing) {
    if (existing.status === 'ACTIVE') {
      // Real conflict — let it fail naturally via a thrown ConflictException
      // (not Prisma-level, since we're not calling create() here).
      throw new ConflictException(ERROR_CODES.DUPLICATE_VALUE);
    }

    // PENDING_ACTIVATION: incomplete registration — resend OTP instead of
    // creating a second row (which would hit the unique constraint anyway).
    const password = await hashPassword(dto.password); // allow changing password on retry
    await this.prisma.account.update({
      where: { id: existing.id },
      data: {
        password,
        preferredLanguage: (dto.language ?? 'ar').toUpperCase() as 'AR' | 'EN',
      },
    });
    await this.otpService.send(existing.id, dto.phone, OtpType.ACCOUNT_ACTIVATION);
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
  await this.otpService.send(account.id, dto.phone, OtpType.ACCOUNT_ACTIVATION);
  return { accountId: account.id };
}

  // Step 2/2: verify OTP, activate the account, assign the PATIENT role.
  async registerVerify(dto: VerifyRegistrationOtpDto) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { phone: dto.phone },
    });

    await this.otpService.verify(account.id, OtpType.ACCOUNT_ACTIVATION, dto.code);

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

    return this.buildAuthenticatedResponse(account.id, account.phone,AccountStatus.ACTIVE);
  }

  // عدّلي login() بالكامل لتصير:
async login(dto: LoginDto): Promise<TokenPairDto> {
  const account = await this.prisma.account.findUnique({ where: { phone: dto.phone } });

  if (!account || !account.password) {
    throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
  }

  const passwordMatches = await comparePassword(dto.password, account.password);
  if (!passwordMatches) {
    throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
  }

  if (account.status === 'INVITED') {
    // Correct temp password on an INVITED account — patient must complete
    // activation before getting a real token pair.
    const temporaryToken = this.tokenService.issueActivationToken(account.id);
      return new TokenPairDto({
      activationRequired: true,
      temporaryToken,
    });
  }

  if (account.status !== 'ACTIVE') {
    // PENDING_ACTIVATION (self-registration not yet OTP-verified) or
    // DISABLED — neither should be able to log in at all.
    throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
  }

  return this.buildAuthenticatedResponse(account.id, account.phone, account.status);
}

// method جديدة — بديل التعامل مع mustChangePassword:
async completeActivation(dto: CompleteActivationDto) {
  let accountId: number;
  try {
    accountId = this.tokenService.verifyActivationToken(dto.temporaryToken);
  } catch {
    throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
  }

  const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

  // Defense in depth: even if the token is technically valid, refuse
  // unless the account is genuinely still INVITED (e.g. it was somehow
  // already activated through another path in the meantime).
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

// عدّلي createPatientAccount() — status تبقى INVITED، مش ACTIVE:
async createPatientAccount(patientId: number, dto: CreatePatientAccountDto) {
  const tempPassword = this.generateTempPassword(); //TODO: Implement a secure temp password generator
  const password = await hashPassword(tempPassword);
  const patientRole = await this.prisma.role.findUniqueOrThrow({ where: { code: PATIENT_ROLE_CODE } });

  const account = await this.prisma.$transaction(async (tx) => {
    const created = await tx.account.create({
      data: {
        phone: dto.phone,
        password,
        status: 'INVITED',              // ⬅ كانت ACTIVE، صححناها
        phoneVerifiedAt: new Date(),    // السكرتيرة تحققت من الهوية حضوريًا
      },
    });
    await tx.accountRole.create({ data: { accountId: created.id, roleId: patientRole.id } });
    return created;
  });

  return { accountId: account.id, phone: account.phone, tempPassword };
}
/*
INVITED (secretary creates, temp password known)
      │
      ▼
POST /auth/login {phone, tempPassword}
      │
      ▼
{ activationRequired: true, temporaryToken }
      │
      ▼
POST /auth/complete-activation {temporaryToken, newPassword}
      │
      ▼
status = ACTIVE  →  { accessToken, refreshToken, accountStatus: "ACTIVE" }
      │
      ▼
DISABLED (لاحقًا، من الأدمن)
*/

// عدّلي التوقيع فقط (إضافة status parameter):
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  private async buildAuthenticatedResponse(accountId: number, phone: string, status: AccountStatus) {
    const roles = await this.accountRolesService.getAuthenticatedAccountPayload(accountId);
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId }, select: { preferredLanguage: true } });
    const tokenPair = this.tokenService.issueTokenPair({ id: accountId, phone, preferredLanguage: account.preferredLanguage.toLowerCase() as 'ar' | 'en', roles }, status);
    return new TokenPairDto({ ...tokenPair, accountStatus: status });
  }
  // NOTE: stateless refresh (no RefreshToken table) — see the Epic 3 opening
  // note. This re-issues a fresh pair from a still-valid refresh token, but
  // cannot revoke the OLD refresh token (it stays valid until it expires
  // naturally). Fine for MVP; flag if you want real rotation/revocation.
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

  // Stateless logout: nothing to invalidate server-side. Endpoint exists
  // for API symmetry / future extension (e.g. once a RefreshToken table
  // exists, this is where it gets revoked).
  async logout(): Promise<void> {
    return;
  }
  

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { phone: dto.phone } });
    // Deliberately don't throw NOT_FOUND here — revealing whether a phone
    // number is registered is itself an information leak. Silently no-op
    // if the account doesn't exist; the OTP is only sent when it does.
    if (!account) return;

    await this.otpService.send(account.id, dto.phone, OtpType.RESET_PASSWORD);
  }

  async resetPasswordWithOtp(dto: ResetPasswordWithOtpDto): Promise<void> {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { phone: dto.phone } });

    await this.otpService.verify(account.id, OtpType.RESET_PASSWORD, dto.code);

    const password = await hashPassword(dto.newPassword);
    await this.prisma.account.update({ where: { id: account.id }, data: { password } });
  }

  async startChangePhone(accountId: number, dto: StartChangePhoneDto): Promise<void> {
    // Requires the OtpVerification.metadata column mentioned above.
    const code = await this.otpService.sendWithMetadata(
      accountId,
      dto.newPhone,
      OtpType.CHANGE_PHONE,
      { newPhone: dto.newPhone },
    );
    //return code;
  }

  async confirmChangePhone(accountId: number, dto: ConfirmChangePhoneDto): Promise<void> {
    const otp = await this.otpService.verifyAndReturnMetadata(
      accountId,
      OtpType.CHANGE_PHONE,
      dto.code,
    );
    const newPhone = (otp.metadata as { newPhone: string }).newPhone;

    // No manual duplicate check — P2002 on update() -> 409 DUPLICATE_VALUE
    // via PrismaExceptionFilter, same pattern as everywhere else.
    await this.prisma.account.update({ where: { id: accountId }, data: { phone: newPhone } });
  }

  async toggleBiometric(accountId: number, dto: ToggleBiometricDto): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { biometricEnabled: dto.enabled },
    });
  }


  // modules/auth/services/auth.service.ts — أضيفي:

async startInvitationActivation(phone: string): Promise<void> {
  const account = await this.prisma.account.findUniqueOrThrow({ where: { phone } });
  if (account.status !== 'INVITED') {
    throw new BadRequestException('ACCOUNT_NOT_INVITED');
  }
  await this.otpService.send(account.id, phone, OtpType.ACCOUNT_ACTIVATION); // reuse ACCOUNT_ACTIVATION type
}

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
  async changePassword(accountId: number, dto: ChangePasswordDto): Promise<void> {
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

    if (!account.password) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    const passwordMatches = await comparePassword(dto.currentPassword, account.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    const password = await hashPassword(dto.newPassword);
    await this.prisma.account.update({
      where: { id: accountId },
      data: { password },
    });
  }

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