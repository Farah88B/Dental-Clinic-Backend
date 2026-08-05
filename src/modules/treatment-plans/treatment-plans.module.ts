import { Module, forwardRef } from '@nestjs/common';
import { TreatmentPlansController } from './controllers/treatment-plans.controller';
import { NestedTreatmentSessionsController } from './controllers/nested-treatment-sessions.controller';
import { TreatmentPlansService } from './services/treatment-plans.service';
import { TreatmentPlanAdapter } from './adapter/treatment-plan.adapter';
import { TreatmentSessionsModule } from 'src/modules/treatment-sessions/treatment-sessions.module';

@Module({
  imports: [forwardRef(() => TreatmentSessionsModule)],
  controllers: [TreatmentPlansController, NestedTreatmentSessionsController],
  providers: [TreatmentPlansService, TreatmentPlanAdapter],
  exports: [TreatmentPlansService],
})
export class TreatmentPlansModule {}
