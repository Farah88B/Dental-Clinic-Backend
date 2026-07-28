import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  ValidateNested,
  Min,
} from 'class-validator';

export class ReorderPatientFormFieldItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty({ example: 1, description: 'Target display order for this field' })
  @IsInt()
  @Min(0)
  displayOrder!: number;
}

export class ReorderPatientFormFieldsDto {
  @ApiProperty({ type: [ReorderPatientFormFieldItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: ReorderPatientFormFieldItemDto) => item.id)
  @ValidateNested({ each: true })
  @Type(() => ReorderPatientFormFieldItemDto)
  fields!: ReorderPatientFormFieldItemDto[];
}