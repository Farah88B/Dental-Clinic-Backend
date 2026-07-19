import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'RECEPTIONIST', description: 'Unique programmatic code, uppercase snake_case' })
  @IsString()
  @Matches(/^[A-Z_]+$/, { message: 'code must be uppercase letters and underscores only' })
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'موظف استقبال' })
  @IsString()
  nameAr!: string;

  @ApiProperty({ example: 'Receptionist' })
  @IsString()
  nameEn!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descriptionEn?: string;
}