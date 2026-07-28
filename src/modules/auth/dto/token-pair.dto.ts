// modules/auth/dto/token-pair.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class TokenPairDto {

  @ApiProperty({ required: false })
  accessToken?: string;

  @ApiProperty({ required: false })
  refreshToken?: string;

  @ApiProperty({ enum: AccountStatus, required: false })
  accountStatus?: AccountStatus;

  @ApiProperty()
  activationRequired!: boolean;

  @ApiProperty({ required: false })
  temporaryToken?: string;

  constructor(partial: Partial<TokenPairDto>) {
      Object.assign(this, partial);
  }
}