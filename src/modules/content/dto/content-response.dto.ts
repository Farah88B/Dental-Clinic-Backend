import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus, ContentType } from '@prisma/client';

export class ContentMediaItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() mediaFileId!: number;
  @ApiProperty() displayOrder!: number;
  @ApiProperty() originalName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() url!: string;

  constructor(partial: Partial<ContentMediaItemDto>) {
    Object.assign(this, partial);
  }
}

export class ContentResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty({ enum: ContentType }) type!: ContentType;
  @ApiProperty({ enum: ContentStatus }) status!: ContentStatus;
  @ApiProperty() title!: string;
  @ApiProperty({ required: false, nullable: true }) body!: string | null;
  @ApiProperty({ type: [ContentMediaItemDto] }) mediaFiles!: ContentMediaItemDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<ContentResponseDto>) {
    Object.assign(this, partial);
  }
}
