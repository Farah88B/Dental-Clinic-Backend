/**
 * Central application error codes.
 *
 * These codes are returned to the frontend.
 * The frontend should rely on these codes,
 * not on translated messages.
 */
export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',

  DUPLICATE_VALUE: 'DUPLICATE_VALUE',

  IN_USE_CANNOT_DELETE: 'IN_USE_CANNOT_DELETE',

  INVALID_TOKEN: 'INVALID_TOKEN',

  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',

  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  CANNOT_DISABLE_LAST_ADMIN:
    'CANNOT_DISABLE_LAST_ADMIN',

  INTERNAL_ERROR: 'INTERNAL_ERROR',

  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',

  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
} as const;

export type ErrorCode =
  (typeof ERROR_CODES)[keyof typeof ERROR_CODES];