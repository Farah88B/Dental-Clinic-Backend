// modules/auth/dto/login.dto.ts
import { IsNotEmpty, IsPhoneNumber, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty() @Matches(/^09\d{8}$/, {
  message: 'phone must be a valid Syrian mobile number',
})
phone!: string;
  @ApiProperty() @IsString() @IsNotEmpty() password!: string;
}