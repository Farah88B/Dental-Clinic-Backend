// modules/auth/dto/register.dto.ts
import { IsPhoneNumber, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from 'src/common/decorators/match.decorator';

export class RegisterDto {
  @ApiProperty() @Matches(/^09\d{8}$/, {
  message: 'phone must be a valid Syrian mobile number',
})
phone!: string;
  @ApiProperty() @IsString() @MinLength(8) password!: string;
  @ApiProperty() @IsString() @MinLength(8) @Match('password', { message: 'PASSWORDS_DO_NOT_MATCH' })
  confirmPassword!: string;
}