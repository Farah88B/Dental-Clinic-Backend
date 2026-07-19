// modules/auth/dto/forgot-password.dto.ts
import { IsPhoneNumber, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty() @Matches(/^09\d{8}$/, {
  message: 'phone must be a valid Syrian mobile number',
})
phone!: string;
}