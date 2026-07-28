import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class TogglePatientFormFieldStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}