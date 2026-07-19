import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'The current password of the account' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ description: 'The new password to set' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
