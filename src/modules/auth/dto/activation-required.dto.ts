import { ApiProperty } from '@nestjs/swagger';

export class ActivationRequiredDto {
  @ApiProperty({ example: true }) activationRequired: true;
  @ApiProperty() temporaryToken: string;

  constructor(temporaryToken: string) {
    this.activationRequired = true;
    this.temporaryToken = temporaryToken;
  }
}