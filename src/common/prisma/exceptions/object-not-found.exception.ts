import { OrmExceptionBase } from './orm-exception.base.exception';

// Raised when Prisma's update/delete/findUniqueOrThrow targets a row
// that does not exist.
export class ObjectNotFoundException extends OrmExceptionBase {}