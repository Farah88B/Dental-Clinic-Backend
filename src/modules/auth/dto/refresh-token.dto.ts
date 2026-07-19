// modules/auth/dto/refresh-token.dto.ts
import { IsJWT } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty() @IsJWT() refreshToken!: string;
}