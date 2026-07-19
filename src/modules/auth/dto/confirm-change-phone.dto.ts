// modules/auth/dto/confirm-change-phone.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmChangePhoneDto {
  @ApiProperty() @IsString() @Length(6, 6) code!: string;
}