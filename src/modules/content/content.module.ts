import { Module } from '@nestjs/common';
import { MediaModule } from 'src/common/media/media.module';
import { ContentStaffController } from './controllers/content-staff.controller';
import { ContentPatientController } from './controllers/content-patient.controller';
import { ContentService } from './services/content.service';
import { ContentAdapter } from './adapter/content.adapter';

@Module({
  imports: [MediaModule],
  controllers: [ContentStaffController, ContentPatientController],
  providers: [ContentService, ContentAdapter],
  exports: [ContentService],
})
export class ContentModule {}
