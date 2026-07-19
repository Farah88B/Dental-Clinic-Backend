/**
 * Logs every incoming HTTP request and its execution result.
 * Records request ID, HTTP method, path, status code and execution time.
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
 constructor(
    private readonly logger: PinoLogger,
) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
  const request = context.switchToHttp().getRequest<Request>();

  const response = context.switchToHttp().getResponse<Response>();

  const startedAt = performance.now();

    return next.handle().pipe(
      tap(() => {
       const duration = performance.now() - startedAt;

        this.logger.info(
         [
            request.requestId,
            request.method,
            request.originalUrl,
            response.statusCode,
            `${duration.toFixed(2)} ms`,
            ].join(' | '),
        );
      }),
    );
  }
}

/*
for response the message will be like this:

    c58c...

    GET

    /api/v1/accounts

    200

    18.33 ms
*/