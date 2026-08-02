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
import { resolveLanguageFromRequest } from '../i18n/helper';

  import { ERROR_CODES } from '../constants/error-codes.constants';
import { translate, isKnownErrorCode } from '../i18n/helper';
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
    exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
  const lang = resolveLanguageFromRequest(request as any);

  const errorMap: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

let error = errorMap[statusCode] ?? 'Internal Server Error';
  let message = translate(ERROR_CODES.INTERNAL_ERROR, lang);

  let details: unknown = null;

  if (exception instanceof HttpException) {
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      message = isKnownErrorCode(exceptionResponse)
        ? translate(exceptionResponse, lang)
        : exceptionResponse;

      error = errorMap[statusCode] ?? error;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const body = exceptionResponse as Record<string, any>;
      error = body.error ?? error;

      if (Array.isArray(body.message)) {
        message = 'Validation failed.';
        details = body.message.map((item: string) => ({ message: item }));
      } else if (typeof body.message === 'string' && isKnownErrorCode(body.message)) {
        message = translate(body.message, lang);
      } else if (body.code) {
        message = translate(body.code, lang);
      } else if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message;
      } else if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
        message = translate(ERROR_CODES.RATE_LIMIT_EXCEEDED, lang);
        error = 'Too Many Requests';
      } else {
        message = body.message ?? message;
      }

      details = body.details ?? details;
    }
  }

  this.logger.error({
    requestId: request.requestId,
    method: request.method,
    url: request.originalUrl,
    statusCode,
    error: exception instanceof Error ? exception.message : String(exception),
    stack: exception instanceof Error ? exception.stack : undefined,
  });

  writeErrorResponse(response, statusCode, message, error, details);
}
}