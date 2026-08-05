import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { Request } from 'express';

import { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import { AUTH_ERROR_CODES } from 'src/common/constants/auth.constants';
import { AccountRolesService } from 'src/modules/account-roles/services/account-roles.service';

interface JwtPayload {
  sub: number;
  phone: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly accountRolesService: AccountRolesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<AuthenticatedAccount> {
    const account = await this.prisma.account.findUnique({ where: { id: payload.sub } });
    const isMeRoute = request.originalUrl.split('?')[0].endsWith('/auth/me');

    if (!account || (!isMeRoute && account.status !== 'ACTIVE')) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    const roles = await this.accountRolesService.getAuthenticatedAccountPayload(account.id);

    return {
      id: account.id,
      phone: account.phone,
      preferredLanguage: account.preferredLanguage.toLowerCase() as 'ar' | 'en',
      roles,
    };
  }
}

  // Runs on EVERY authenticated request — re-fetches current roles/permissions
  // from the DB rather than trusting whatever was baked into the token at
  // login time, so a permission revoked mid-session takes effect immediately
  // on the account's next request (matches the Epic 1 rule: "removing a
  // permission from a role applies immediately to all holders").
  