/**
 * Wraps every successful response in a unified response structure.
 * If the response already contains { data, message, statusCode },
 * those values are used. Otherwise, default values are applied.
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { Observable, map } from 'rxjs';

import { BaseResponseDto } from '../dto/base-response.dto';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, BaseResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<BaseResponseDto<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((result: any) => {
        const isWrapped =
          result &&
          typeof result === 'object' &&
          'data' in result;

        return {
          success: true,

          statusCode: isWrapped
            ? (result.statusCode ?? response.statusCode)
            : response.statusCode,

          message: isWrapped
            ? (result.message ?? 'Success')
            : 'Success',

          data: isWrapped
            ? result.data
            : result,


        };
      }),
    );
  }
}