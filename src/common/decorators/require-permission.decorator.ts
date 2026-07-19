/**
 * Declares the permission(s) required to execute an endpoint.
 *
 * Multiple permissions may be supplied.
 * PermissionsGuard ensures the authenticated account owns ALL of them.
 *
 * Example:
 * @RequirePermission('accounts.create')
 * @RequirePermission('roles.read', 'permissions.read')
 */

import { SetMetadata } from '@nestjs/common';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

export const REQUIRE_PERMISSION_KEY =
  AUTH_CONSTANTS.REQUIRED_PERMISSIONS;

export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);