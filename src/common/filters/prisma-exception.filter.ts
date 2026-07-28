/**
 * Global Prisma exception filter.
 *
 * Catches raw Prisma database errors,
 * converts them into application exceptions,
 * then maps them into HTTP exceptions.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaErrorHandlerService } from '../prisma/services/prisma-error-handler.service';
import { PrismaHttpExceptionMapperService } from '../prisma/services/prisma-http-exception-mapper.service';
import { resolveLanguageFromRequest } from '../i18n/helper';
import { OrmExceptionBase } from '../prisma/exceptions/orm-exception.base.exception';
import { writeErrorResponse } from './write-error-response.util';
import { ERROR_CODES } from '../constants/error-codes.constants';
import { translate } from '../i18n/helper';

 @Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter
  implements ExceptionFilter
{

  constructor(
    private readonly handler: PrismaErrorHandlerService,
    private readonly mapper: PrismaHttpExceptionMapperService,
  ) {}

catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
  const ctx = host.switchToHttp();
  const request = ctx.getRequest();
  const response = ctx.getResponse();
  const language = resolveLanguageFromRequest(request as any);

  try {
    this.handler.handle(exception);
  } catch (error) {
    const httpException = this.mapper.map(error as OrmExceptionBase, language);
    const status = httpException.getStatus();
    const body = httpException.getResponse() as any;

   
    const code = typeof body === 'object' && body?.code ? body.code : ERROR_CODES.INTERNAL_ERROR;
    const message = translate(code, language);  
    const errorName = typeof body === 'object' && body?.error ? body.error : 'Bad Request';

    writeErrorResponse(response, status, message, errorName, null);
  }
}

}