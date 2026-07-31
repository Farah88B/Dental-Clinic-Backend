import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class LinkPatientAccountDto {
  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  accountId!: number;
}