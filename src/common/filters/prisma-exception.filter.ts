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
import { resolveLanguageFromHeader } from '../i18n/helper';
import { OrmExceptionBase } from '../prisma/exceptions/orm-exception.base.exception';
import { writeErrorResponse } from './write-error-response.util';
/*

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter
  implements ExceptionFilter
{

  constructor(
    private readonly handler: PrismaErrorHandlerService,

    private readonly mapper: PrismaHttpExceptionMapperService,
  ) {}


  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {


    const request =
      host.switchToHttp()
          .getRequest();


    const language =
      resolveLanguageFromHeader(
        request.headers['accept-language'],
      );


    try {

      // Raw Prisma error -> Application exception
      this.handler.handle(exception);


    } catch(error) {


      // Application exception -> HTTP exception
      throw this.mapper.map(
        error as OrmExceptionBase,
        language,
      );

    }

  }

}
  */
 @Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter
  implements ExceptionFilter
{

  constructor(
    private readonly handler: PrismaErrorHandlerService,
    private readonly mapper: PrismaHttpExceptionMapperService,
  ) {}


  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {


    const ctx = host.switchToHttp();

    const request = ctx.getRequest();

    const response = ctx.getResponse();

/*
    const language =
      resolveLanguageFromHeader(
        request.headers['accept-language'],
      );

*/
    const language = 'en';
    try {

      this.handler.handle(exception);


    } catch(error) {


      const httpException =
        this.mapper.map(
          error as OrmExceptionBase,
          language,
        );

      const status =
        httpException.getStatus();

      const body =
        httpException.getResponse() as any;

      const message = typeof body === 'object' ? body.message : String(body);
      const errorName = typeof body === 'object' ? body.error : 'Bad Request';

      writeErrorResponse(response, status, message, errorName, null);
    }

  }

}