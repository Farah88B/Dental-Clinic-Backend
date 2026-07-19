/**
 * Marks an endpoint as publicly accessible.
 *
 * Any route decorated with @Public() bypasses JwtAuthGuard.
 *
 * Example:
 * @Public()
 * @Post('login')
 */


import { SetMetadata } from '@nestjs/common';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

export const IS_PUBLIC_KEY = AUTH_CONSTANTS.PUBLIC_ROUTE;

export const Public = () =>
  SetMetadata(IS_PUBLIC_KEY, true);