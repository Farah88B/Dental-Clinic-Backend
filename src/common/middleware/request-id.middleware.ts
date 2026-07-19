/**
 * Generates a unique request ID for every incoming HTTP request.
 * The ID is attached to both the request object and the response headers
 * to enable end-to-end request tracing across logs.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const requestId = randomUUID();

    req['requestId'] = requestId;

    res.setHeader('X-Request-Id', requestId);

    next();
  }
}