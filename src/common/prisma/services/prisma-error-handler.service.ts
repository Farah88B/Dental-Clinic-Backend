import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaErrorCode } from '../exceptions/exception.enum';
import { OrmExceptionBase } from '../exceptions/orm-exception.base.exception';
import { UniqueConstraintValidationException } from '../exceptions/unique-constraint-validation.exception';
import { ForeignKeyConstraintFailException } from '../exceptions/foreign-key-constraint-fail.exception';
import { ObjectNotFoundException } from '../exceptions/object-not-found.exception';

// Stage 1 of the error pipeline: raw Prisma error -> domain exception.
// Any caller (a service method) that wraps its call in a try/catch and
// re-throws through this handler no longer needs to know Prisma error codes.
@Injectable()
export class PrismaErrorHandlerService {
  handle(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case PrismaErrorCode.UNIQUE_CONSTRAINT_VIOLATION:
          throw new UniqueConstraintValidationException(
            'A record with this value already exists',
            error.meta,
          );
        case PrismaErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION:
          throw new ForeignKeyConstraintFailException(
            'This record is still referenced by other data',
            error.meta,
          );
        case PrismaErrorCode.RECORD_NOT_FOUND:
          throw new ObjectNotFoundException('Record not found', error.meta);
      }
    }
    // Unrecognized error — let it propagate as-is so nothing is silently swallowed.
    throw error;
  }

  // Convenience wrapper: run a Prisma call and translate any known error.
  async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OrmExceptionBase) throw error;
      this.handle(error);
    }
  }
}