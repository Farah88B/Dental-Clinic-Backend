import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator'; // ⬅ مش من @nestjs/terminus
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { API } from 'src/common/constants/api.constants';

@ApiTags('System')
@Controller(API.HEALTH_PATH)
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly prismaIndicator: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health Check' })
  check() {
    return this.health.check([() => this.prismaIndicator.pingCheck('database')]);
  }
}