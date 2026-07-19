import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAccountRoleDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  roleId!: number;
}