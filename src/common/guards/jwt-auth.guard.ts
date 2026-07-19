/**
 * Authenticates incoming JWT access tokens.
 *
 * If the endpoint is marked with @Public(),
 * authentication is skipped.
 *
 * On success, the decoded JWT payload is attached
 * to request.user.
 */

import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedAccount } from '../interfaces/authenticated-account.interface';
import { ERROR_CODES } from '../constants/error-codes.constants';


@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

 handleRequest<TUser = AuthenticatedAccount>(
  err: unknown,
  user: TUser,
  info: unknown,
  context: ExecutionContext,
): TUser {
  if (err || !user) {
    throw new UnauthorizedException({
  code: ERROR_CODES.INVALID_TOKEN,
  message: 'Invalid access token',
});
  }

  return user;
}
}