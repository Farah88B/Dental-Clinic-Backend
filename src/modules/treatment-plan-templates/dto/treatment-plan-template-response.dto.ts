import { ApiProperty } from '@nestjs/swagger';
import { TreatmentSessionTemplateResponseDto } from './treatment-session-template-response.dto';

export class TreatmentPlanTemplateResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Decimal serialized as string — SUM of session estimatedCost' })
  estimatedCost!: string;
  @ApiProperty({ required: false, nullable: true }) createdByAccountId!: number | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ description: 'Count of active session templates' })
  sessionCount!: number;
  @ApiProperty({
    type: [TreatmentSessionTemplateResponseDto],
    description: 'Active sessions on getById; empty array on list',
  })
  sessionTemplates!: TreatmentSessionTemplateResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  constructor(partial: Partial<TreatmentPlanTemplateResponseDto>) {
    Object.assign(this, partial);
  }
}
