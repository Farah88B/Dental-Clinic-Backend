// modules/auth/dto/verify-otp.dto.ts
import { IsEnum, IsPhoneNumber, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OtpType } from '@prisma/client';

export class VerifyOtpDto {
  @ApiProperty()  @Matches(/^09\d{8}$/, {
    message: 'phone must be a valid Syrian mobile number',
  })phone!: string;
  @ApiProperty({ enum: OtpType }) @IsEnum(OtpType) type!: OtpType;
  @ApiProperty({ example: '123456' }) @IsString() @Length(6, 6) code!: string;
}