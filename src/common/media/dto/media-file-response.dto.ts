import { ApiProperty } from '@nestjs/swagger';
import { MediaFileCategory } from '@prisma/client';

export class MediaFileResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  storedName!: string;

  @ApiProperty({ example: 'profiles/abc123.jpg' })
  path!: string;

  @ApiProperty({ example: '/uploads/profiles/abc123.jpg' })
  url!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty({ enum: MediaFileCategory })
  category!: MediaFileCategory;

  @ApiProperty()
  createdAt!: Date;

  constructor(partial: Partial<MediaFileResponseDto>) {
    Object.assign(this, partial);
  }
}
