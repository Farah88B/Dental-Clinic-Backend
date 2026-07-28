import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetLanguageDto {
  @ApiProperty({ enum: ['ar', 'en'], example: 'en' })
  @IsIn(['ar', 'en'])
  language!: 'ar' | 'en';
}
