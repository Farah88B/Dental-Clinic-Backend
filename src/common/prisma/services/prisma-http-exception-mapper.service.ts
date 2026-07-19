import { Injectable } from '@nestjs/common';
import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrmExceptionBase } from '../exceptions/orm-exception.base.exception';
import { UniqueConstraintValidationException } from '../exceptions/unique-constraint-validation.exception';
import { ForeignKeyConstraintFailException } from '../exceptions/foreign-key-constraint-fail.exception';
import { ObjectNotFoundException } from '../exceptions/object-not-found.exception';
import { Language, translate } from 'src/common/i18n/helper';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';


// Stage 2 of the error pipeline: domain exception -> HTTP exception.
// Used by the global exception filter so that ANY OrmExceptionBase thrown
// anywhere in the app (by any module's service) is turned into the correct
// status code and a bilingual message automatically.
@Injectable()
export class PrismaHttpExceptionMapperService {
  map(error: OrmExceptionBase, lang: Language = 'en'): HttpException {
    if (error instanceof ForeignKeyConstraintFailException) {
      return new ConflictException({
        code: ERROR_CODES.IN_USE_CANNOT_DELETE,
        message: translate(ERROR_CODES.IN_USE_CANNOT_DELETE, lang),
      });
    }
    if (error instanceof UniqueConstraintValidationException) {
      return new ConflictException({
        code: ERROR_CODES.DUPLICATE_VALUE,
        message: translate(ERROR_CODES.DUPLICATE_VALUE, lang),
      });
    }
    if (error instanceof ObjectNotFoundException) {
      return new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: translate(ERROR_CODES.NOT_FOUND, lang),
      });
    }
    return new InternalServerErrorException({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: translate(ERROR_CODES.INTERNAL_ERROR, lang),
    });
  }
}