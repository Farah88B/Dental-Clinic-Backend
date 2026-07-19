import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { RoleAdapter } from './adapter/role.adapter';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RoleAdapter],
  exports: [RolesService],
})
export class RolesModule {}