import { ApiProperty } from '@nestjs/swagger';

export class RegeneratePatientPasswordResponseDto {
  @ApiProperty()
  accountId!: number;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  tempPassword!: string;

  constructor(partial: Partial<RegeneratePatientPasswordResponseDto>) {
    Object.assign(this, partial);
  }
}