/**
 * Uses the authenticated account id as the
 * throttling key whenever available.
 *
 * Otherwise falls back to the client IP.
 */

import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard
  extends ThrottlerGuard
{
  protected async getTracker(
    request: Record<string, any>,
  ): Promise<string> {

    const accountId =
      request.user?.id;

    if (accountId) {
      return `account:${accountId}`;
    }

    return request.ip;
  }
}