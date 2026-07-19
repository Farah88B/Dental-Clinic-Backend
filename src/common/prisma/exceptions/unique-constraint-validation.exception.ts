import { OrmExceptionBase } from './orm-exception.base.exception';

// Raised when a Prisma write violates a @unique constraint
// (e.g. Account.phone already exists).
export class UniqueConstraintValidationException extends OrmExceptionBase {}