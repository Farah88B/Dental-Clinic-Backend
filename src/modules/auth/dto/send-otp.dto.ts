// modules/auth/dto/send-otp.dto.ts
import { IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OtpType } from '@prisma/client';

export class SendOtpDto {
  @ApiProperty() @Matches(/^09\d{8}$/, {
  message: 'phone must be a valid Syrian mobile number',
})
phone!: string;
  @ApiProperty({ enum: OtpType }) @IsEnum(OtpType) type!: OtpType;
}