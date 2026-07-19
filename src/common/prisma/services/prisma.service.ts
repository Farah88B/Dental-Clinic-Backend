/**
 * Central Prisma database service.
 * Handles database connection lifecycle.
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import { PrismaClient as PrismaBaseClient } from '@prisma/client';


@Injectable()
export class PrismaService
  extends PrismaBaseClient
  implements OnModuleInit, OnModuleDestroy
{

  constructor() {
    super({
      log: [
        'error',
        'warn',
        'info',
      ],
    });
  }


  async onModuleInit() {
    await this.$connect();
  }


  async onModuleDestroy() {
    await this.$disconnect();
  }

}