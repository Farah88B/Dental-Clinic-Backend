/**
 * Marks an endpoint as an auditable action.
 *
 * AuditLogInterceptor records every successful
 * or failed execution.
 *
 * Example:
 *
 * @AuditAction('ACCOUNT_CREATED')
 */


import { SetMetadata } from '@nestjs/common';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

export const AUDIT_ACTION_KEY =
  AUTH_CONSTANTS.AUDIT_ACTION;

export const AuditAction = (action: string) =>
  SetMetadata(AUDIT_ACTION_KEY, action);