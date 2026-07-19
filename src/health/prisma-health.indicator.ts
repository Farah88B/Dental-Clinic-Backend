// common/health/prisma-health.indicator.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from 'src/common/prisma/services/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new InternalServerErrorException(
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}