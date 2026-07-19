// modules/auth/dto/reset-password-with-otp.dto.ts
import { IsPhoneNumber, IsString, Length, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordWithOtpDto {
  @ApiProperty() @Matches(/^09\d{8}$/, {
  message: 'phone must be a valid Syrian mobile number',
})
phone!: string;
  @ApiProperty() @IsString() @Length(6, 6) code!: string;
  @ApiProperty() @IsString() @MinLength(8) newPassword!: string;
}