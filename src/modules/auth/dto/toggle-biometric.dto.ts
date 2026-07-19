// modules/auth/dto/toggle-biometric.dto.ts
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleBiometricDto {
  @ApiProperty() @IsBoolean() enabled!: boolean;
}