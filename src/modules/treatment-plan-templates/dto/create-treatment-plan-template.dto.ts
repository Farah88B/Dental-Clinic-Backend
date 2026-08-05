import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateTreatmentSessionTemplateDto } from './create-treatment-session-template.dto';

export class CreateTreatmentPlanTemplateDto {
  @ApiProperty({ example: 'علاج عصب' })
  @IsString()
  nameAr!: string;

  @ApiProperty({ example: 'Root Canal' })
  @IsString()
  nameEn!: string;

  @ApiProperty({
    required: false,
    type: [CreateTreatmentSessionTemplateDto],
    description: 'Optional sessions created with the template in the same request',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreatmentSessionTemplateDto)
  sessions?: CreateTreatmentSessionTemplateDto[];
}
