import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// accountId is dropped — it comes from the route param, not the body.
export class ResetPasswordDto {
  @ApiProperty({ example: 'TempPass123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}