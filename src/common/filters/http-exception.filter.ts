/**
 * Global exception filter.
 *
 * Converts every application exception into
 * a unified error response.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { writeErrorResponse } from './write-error-response.util';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
   constructor(
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();

    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error.';

    let error = 'Internal Server Error';

    let details: unknown = null;

   if (exception instanceof HttpException) {
  const exceptionResponse = exception.getResponse();

  if (typeof exceptionResponse === 'string') {
    message = exceptionResponse;
  }

  else if (
    typeof exceptionResponse === 'object' &&
    exceptionResponse !== null
  ) {
    const body = exceptionResponse as Record<string, any>;

    error = body.error ?? error;


    if (Array.isArray(body.message)) {
      // ValidationPipe errors
      message = 'Validation failed.';

      details = body.message.map((item) => ({
        message: item,
      }));
    }

    else {
      message = body.message ?? message;

      details = body.details ?? null;
    }
  }
}

   this.logger.error({
  requestId: request.requestId,
  method: request.method,
  url: request.originalUrl,
  statusCode,
  error:
    exception instanceof Error
      ? exception.message
      : String(exception),
  stack:
    exception instanceof Error
      ? exception.stack
      : undefined,
});

    writeErrorResponse(response, statusCode, message, error, details);
  }
}