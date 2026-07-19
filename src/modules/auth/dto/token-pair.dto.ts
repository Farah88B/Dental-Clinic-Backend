// modules/auth/dto/token-pair.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class TokenPairDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ enum: AccountStatus }) accountStatus!: AccountStatus;
  constructor(partial: TokenPairDto) {
    Object.assign(this, partial);
  }
}