import { IsInt, IsNotEmpty, IsPhoneNumber, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ example: '0999999999' })
  @IsNotEmpty()
   @ApiProperty() @Matches(/^09\d{8}$/, {
   message: 'phone must be a valid Syrian mobile number',
 })
 phone!: string;

  @ApiProperty({ example: 2, description: 'Role to assign immediately (e.g. SECRETARY)' })
  @IsNotEmpty()
  @IsInt()
  roleId!: number;
}