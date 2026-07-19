import { OrmExceptionBase } from './orm-exception.base.exception';

// Raised when deleting/updating a row that other rows still reference
// (e.g. deleting a Role still assigned to Accounts).
export class ForeignKeyConstraintFailException extends OrmExceptionBase {}