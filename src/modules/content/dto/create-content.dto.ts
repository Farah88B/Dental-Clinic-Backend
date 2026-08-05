import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus, ContentType } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty({ enum: ContentType })
  @IsEnum(ContentType)
  type!: ContentType;

  @ApiProperty({ enum: ContentStatus, required: false, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiProperty()
  @IsString()
  titleAr!: string;

  @ApiProperty()
  @IsString()
  titleEn!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bodyAr?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bodyEn?: string;
}
