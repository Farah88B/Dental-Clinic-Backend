import { Module } from '@nestjs/common';
import { MediaModule } from 'src/common/media/media.module';
import { EncountersController } from './controllers/encounters.controller';
import { EncountersService } from './services/encounters.service';
import { EncounterAdapter } from './adapter/encounter.adapter';

@Module({
  imports: [MediaModule],
  controllers: [EncountersController],
  providers: [EncountersService, EncounterAdapter],
  exports: [EncountersService, EncounterAdapter],
})
export class EncountersModule {}
