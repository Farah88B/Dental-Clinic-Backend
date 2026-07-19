/**
 * Authorizes authenticated accounts.
 *
 * JwtAuthGuard identifies WHO is calling.
 *
 * PermissionsGuard determines WHAT they
 * are allowed to do.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

import { AuthenticatedAccount } from '../interfaces/authenticated-account.interface';
import { ERROR_CODES } from '../constants/error-codes.constants';

@Injectable()
export class PermissionsGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        REQUIRE_PERMISSION_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const account =
      request.user as AuthenticatedAccount;

    if (!account) {
   throw new ForbiddenException({
  code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
  message: 'You do not have permission to perform this action.',
});
    }

    const accountPermissions = new Set(
      account.roles.flatMap(
        (role) => role.permissions,
      ),
    );

    const authorized =
      requiredPermissions.every(
        (permission) =>
          accountPermissions.has(permission),
      );

    if (!authorized) {
      throw new ForbiddenException({
  code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
  message: 'You do not have permission to perform this action.',
});
    }

    return true;
  }
}