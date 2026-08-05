import { Module } from '@nestjs/common';
import { TreatmentPlanTemplatesController } from './controllers/treatment-plan-templates.controller';
import { NestedTreatmentSessionTemplatesController } from './controllers/nested-treatment-session-templates.controller';
import { TreatmentSessionTemplatesController } from './controllers/treatment-session-templates.controller';
import { TreatmentPlanTemplatesService } from './services/treatment-plan-templates.service';
import { TreatmentSessionTemplatesService } from './services/treatment-session-templates.service';
import { TreatmentPlanTemplateAdapter } from './adapter/treatment-plan-template.adapter';
import { TreatmentSessionTemplateAdapter } from './adapter/treatment-session-template.adapter';

@Module({
  controllers: [
    TreatmentPlanTemplatesController,
    NestedTreatmentSessionTemplatesController,
    TreatmentSessionTemplatesController,
  ],
  providers: [
    TreatmentPlanTemplatesService,
    TreatmentSessionTemplatesService,
    TreatmentPlanTemplateAdapter,
    TreatmentSessionTemplateAdapter,
  ],
  exports: [TreatmentPlanTemplatesService, TreatmentSessionTemplatesService],
})
export class TreatmentPlanTemplatesModule {}
