import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordTokenDto {
  @ApiProperty()
  resetToken!: string;
}