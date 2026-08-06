/**
 * Swagger documentation for page/pageSize.
 */

import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import { ApiQuery } from '@nestjs/swagger';

import { plainToInstance } from 'class-transformer';

import { PaginationDto } from './pagination.dto';

export const HasPagination = () =>
  applyDecorators(

    ApiQuery({
      name: 'page',
      required: false,
      example: 1,
      type: Number,
    }),

    ApiQuery({
      name: 'pageSize',
      required: false,
      example: 20,
      type: Number,
    }),

  );

export const PaginationQuery =
createParamDecorator(

  (_, ctx: ExecutionContext): PaginationDto => {

    const request =
      ctx.switchToHttp().getRequest();

    const instance = plainToInstance(
      PaginationDto,
      request.query,
      {
        enableImplicitConversion: true,
      },
    );

    return instance;

  },

);