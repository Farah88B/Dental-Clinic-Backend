/**
 * Logs sensitive business actions.
 *
 * Endpoints decorated with @AuditAction()
 * are automatically logged.
 *
 * This interceptor records:
 * - Action name
 * - Account Id
 * - Request Id
 * - HTTP Method
 * - URL
 * - Status Code
 * - Success / Failure
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { PinoLogger } from 'nestjs-pino';

import { AUDIT_ACTION_KEY } from '../decorators/audit-user-action.decorator';

@Injectable()
export class AuditLogInterceptor
  implements NestInterceptor
{
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuditLogInterceptor.name);
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {

    const action =
      this.reflector.getAllAndOverride<string>(
        AUDIT_ACTION_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!action) {
      return next.handle();
    }

    const request =
      context.switchToHttp().getRequest();

    const response =
      context.switchToHttp().getResponse();

    const accountId =
      request.user?.id ?? 'anonymous';

    const requestId =
      request.requestId;

    return next.handle().pipe(
      tap({

        next: () => {

          this.logger.info({
            action,
            accountId,
            requestId,
            method: request.method,
            url: request.originalUrl,
            statusCode: response.statusCode,
            outcome: 'SUCCESS',
          });

        },

        error: (error) => {

          this.logger.warn({
            action,
            accountId,
            requestId,
            method: request.method,
            url: request.originalUrl,
            statusCode: response.statusCode,
            outcome: 'FAILED',
            error: error?.message,
          });

        },

      }),
    );
  }
}