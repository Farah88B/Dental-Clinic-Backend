import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class AuthMeDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ enum: AccountStatus })
  accountStatus!: AccountStatus;

  @ApiProperty({ example: false })
  activationRequired!: false;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ example: 'ar' })
  preferredLanguage!: 'ar' | 'en';

  @ApiProperty({ example: false })
  biometricEnabled!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  constructor(partial: Partial<AuthMeDto>) {
    Object.assign(this, partial);
  }
}
