import { Module } from '@nestjs/common';
import { PermissionsController } from './controllers/permissions.controller';
import { PermissionsService } from './services/permissions.service';
import { PermissionAdapter } from './adapter/permission.adapter';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionAdapter],
  exports: [PermissionsService],
})
export class PermissionsModule {}