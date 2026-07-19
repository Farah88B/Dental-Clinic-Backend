/**
 * Retrieves the authenticated account attached by JwtStrategy.
 *
 * Usage:
 *
 * @ReqUser()
 * @ReqUser('id')
 * @ReqUser('phone')
 */
import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { AuthenticatedAccount } from '../interfaces/authenticated-account.interface';

export const ReqUser = createParamDecorator(
  (property: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const account = request.user as AuthenticatedAccount;

    return property
      ? account?.[property]
      : account;
  },
);