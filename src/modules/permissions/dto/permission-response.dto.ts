import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() code!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
   @ApiProperty() order!: number| null;
  @ApiProperty({ required: false, nullable: true }) descriptionAr!: string | null;
  @ApiProperty({ required: false, nullable: true }) descriptionEn!: string | null;

  constructor(partial: Partial<PermissionResponseDto>) {
    Object.assign(this, partial);
  }
}