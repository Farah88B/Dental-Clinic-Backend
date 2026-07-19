/**
 * Standard pagination DTO.
 *
 * page starts at 1.
 */

import { Type } from 'class-transformer';

import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class PaginationDto {

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }

  get take(): number {
    return this.pageSize;
  }

}