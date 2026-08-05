// modules/auth/services/token.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';
import { ACTIVATION_TOKEN } from 'src/common/constants/otp.constants';
import { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import { TokenPairDto } from '../dto/token-pair.dto';
import { AccountStatus } from '@prisma/client';
import { AUTH_ERROR_CODES } from 'src/common/constants/auth.constants';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Build the access/refresh token pair after a successful login or activation.
  issueTokenPair(
    account: AuthenticatedAccount,
    accountStatus: AccountStatus,
  ): TokenPairDto {
    const payload = {
      sub: account.id,
      phone: account.phone,
      roles: account.roles,
    };

    const accessExpiresIn =
      this.config.getOrThrow<string>('jwt.accessExpiresIn') as SignOptions['expiresIn'];

    const refreshExpiresIn =
      this.config.getOrThrow<string>('jwt.refreshExpiresIn') as SignOptions['expiresIn'];

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwt.sign(
      { sub: account.id },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      },
    );

 return new TokenPairDto({
    accessToken,
    refreshToken,
    accountStatus,
    activationRequired: false,
});
  }

  // Validate refresh tokens and return the account id they belong to.
  verifyRefreshToken(token: string): { sub: number } {
    try {
      return this.jwt.verify(token, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }
  }

  private readonly ACTIVATION_TOKEN_TTL = ACTIVATION_TOKEN.TTL;
  private readonly ACTIVATION_PURPOSE = ACTIVATION_TOKEN.PURPOSE;
  private readonly RESET_PASSWORD_PURPOSE = 'PASSWORD_RESET';

  // Issue a short-lived token for INVITED account activation.
  issueActivationToken(accountId: number): string {
    return this.jwt.sign(
      { sub: accountId, purpose: this.ACTIVATION_PURPOSE },
      { secret: this.config.get('jwt.accessSecret'), expiresIn: this.ACTIVATION_TOKEN_TTL },
    );
  }

  // Verify that a token is really an activation token and not some other JWT.
  verifyActivationToken(token: string): number {
    try {
      const payload = this.jwt.verify<{ sub: number; purpose: string }>(token, {
        secret: this.config.get('jwt.accessSecret'),
      });

      if (payload.purpose !== this.ACTIVATION_PURPOSE) {
        throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
      }

      return payload.sub;
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }
  }

  // Issue a short-lived token used after reset OTP verification.
  issueResetPasswordToken(accountId: number): string {
    return this.jwt.sign(
      { sub: accountId, purpose: this.RESET_PASSWORD_PURPOSE },
      { secret: this.config.get('jwt.accessSecret'), expiresIn: '10m' },
    );
  }

  // Verify the reset-password token and return the target account id.
  verifyResetPasswordToken(token: string): number {
    try {
      const payload = this.jwt.verify<{ sub: number; purpose: string }>(token, {
        secret: this.config.get('jwt.accessSecret'),
      });

      if (payload.purpose !== this.RESET_PASSWORD_PURPOSE) {
        throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
      }

      return payload.sub;
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }
  }
}