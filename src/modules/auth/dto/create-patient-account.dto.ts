import { IsPhoneNumber, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePatientAccountDto {
  @ApiProperty() @Matches(/^09\d{8}$/, {
  message: 'phone must be a valid Syrian mobile number',
})
phone!: string;
  // No password field — always system-generated (see service below).
  // A secretary-chosen password would mean she KNOWS the patient's
  // password even temporarily, same Least-Privilege issue as before.
}