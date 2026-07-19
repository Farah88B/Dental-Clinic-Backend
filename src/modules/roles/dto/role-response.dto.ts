import { ApiProperty } from '@nestjs/swagger';

export class PermissionSummaryDto {
  id!: number;
  code!: string;
  nameAr!: string;
  nameEn!: string;
  order!: number| null;
}

export class RoleResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() code!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty({ required: false, nullable: true }) descriptionAr!: string | null;
  @ApiProperty({ required: false, nullable: true }) descriptionEn!: string | null;
  @ApiProperty({ type: [PermissionSummaryDto] }) permissions!: PermissionSummaryDto[];
  @ApiProperty() createdAt!: Date;

  constructor(partial: Partial<RoleResponseDto>) {
    Object.assign(this, partial);
  }
}