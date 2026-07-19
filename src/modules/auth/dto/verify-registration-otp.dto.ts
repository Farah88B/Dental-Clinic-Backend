// modules/auth/dto/verify-registration-otp.dto.ts
import { IsPhoneNumber, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyRegistrationOtpDto {
  @ApiProperty()  @Matches(/^09\d{8}$/, {
    message: 'phone must be a valid Syrian mobile number',
  })phone!: string;

  @ApiProperty({ example: '123456' }) @IsString() @Length(6, 6) code!: string;
}