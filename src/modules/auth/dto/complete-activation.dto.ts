import { IsJWT, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteActivationDto {
  @ApiProperty() @IsJWT() temporaryToken!: string;
  @ApiProperty() @IsNotEmpty() @IsString() @MinLength(8) newPassword!: string;
}