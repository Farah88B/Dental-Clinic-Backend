import { IsOptional, IsPhoneNumber, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAccountDto {
  @ApiProperty({ required: false })
  @IsOptional()
   @ApiProperty() @Matches(/^09\d{8}$/, {
   message: 'phone must be a valid Syrian mobile number',
 })
 phone!: string;
}