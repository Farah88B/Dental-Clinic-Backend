/**
 * Generic paginated list response.
 */

import { ApiProperty } from '@nestjs/swagger';

export class AdminListDto<T> {

  @ApiProperty({
    isArray: true,
  })
  items!: T[];

  @ApiProperty()
  total!: number;

  constructor(
    items: T[],
    total: number,
  ) {
    this.items = items;
    this.total = total;
  }

}