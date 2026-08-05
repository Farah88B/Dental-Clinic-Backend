import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MedicalAttachmentType } from '@prisma/client';

export class CreateMedicalAttachmentDto {
  @ApiProperty({ enum: MedicalAttachmentType })
  @IsEnum(MedicalAttachmentType)
  type!: MedicalAttachmentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
