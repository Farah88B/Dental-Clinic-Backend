// modules/roles/dto/assign-permissions.dto.ts
import { ArrayUnique, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Full replace, not append: the role ends up with EXACTLY this permission set.
export class AssignPermissionsDto {
  @ApiProperty({ type: [Number], example: [1, 4, 7] })
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  permissionIds!: number[];
}