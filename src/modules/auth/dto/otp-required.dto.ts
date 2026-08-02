import { ApiProperty } from '@nestjs/swagger';

export class OtpRequiredDto {
  @ApiProperty({ example: true })
  otpRequired: true;

  @ApiProperty()
  temporaryToken: string;

  constructor(temporaryToken: string) {
    this.otpRequired = true;
    this.temporaryToken = temporaryToken;
  }
}