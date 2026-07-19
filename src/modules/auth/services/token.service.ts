// modules/auth/services/token.service.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';
import { ACTIVATION_TOKEN } from 'src/common/constants/otp.constants';
import { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import { TokenPairDto } from '../dto/token-pair.dto';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

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
    });
  }

  verifyRefreshToken(token: string): { sub: number } {
    return this.jwt.verify(token, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
    });
  }

private readonly ACTIVATION_TOKEN_TTL = ACTIVATION_TOKEN.TTL;
private readonly ACTIVATION_PURPOSE = ACTIVATION_TOKEN.PURPOSE;

  issueActivationToken(accountId: number): string {
    return this.jwt.sign(
      { sub: accountId, purpose: this.ACTIVATION_PURPOSE },
      { secret: this.config.get('jwt.accessSecret'), expiresIn: this.ACTIVATION_TOKEN_TTL },
    );
  }

  verifyActivationToken(token: string): number {
    const payload = this.jwt.verify<{ sub: number; purpose: string }>(token, {
      secret: this.config.get('jwt.accessSecret'),
    });
    if (payload.purpose !== this.ACTIVATION_PURPOSE) {
      throw new Error('NOT_AN_ACTIVATION_TOKEN');
    }
    return payload.sub;
  }
}