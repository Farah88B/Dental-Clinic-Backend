import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTreatmentPlanDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  patientId!: number;

  @ApiProperty({
    required: false,
    example: 3,
    description: 'When provided, plan is created from this template; otherwise manual',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  templateId?: number;

  @ApiProperty({
    required: false,
    example: 'خطة علاجية يدوية',
    description: 'Required when templateId is omitted',
  })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiProperty({
    required: false,
    example: 'Manual treatment plan',
    description: 'Required when templateId is omitted',
  })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({
    required: false,
    example: 55,
    description: 'When provided, Session #1 is linked to this appointment',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  appointmentId?: number;
}
