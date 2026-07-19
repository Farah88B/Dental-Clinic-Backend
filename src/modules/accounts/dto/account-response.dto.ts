import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

class AccountRoleSummaryDto {
  @ApiProperty() id!: number;
  @ApiProperty() code!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
}

export class AccountResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: AccountStatus }) status!: AccountStatus;
  @ApiProperty() biometricEnabled!: boolean;
  @ApiProperty({ required: false, nullable: true }) phoneVerifiedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true }) createdById!: number | null;
  @ApiProperty({ type: [AccountRoleSummaryDto] }) roles!: AccountRoleSummaryDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<AccountResponseDto>) {
    Object.assign(this, partial);
  }
}