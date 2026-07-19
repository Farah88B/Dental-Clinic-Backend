// modules/auth/dto/start-change-phone.dto.ts
import { IsPhoneNumber, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartChangePhoneDto {
  @ApiProperty() 
  @Matches(/^09\d{8}$/, {
  message: 'phone must be a valid Syrian mobile number',
})
newPhone!: string;
}