import { Module } from '@nestjs/common';
import { AccountRolesController } from './controllers/account-roles.controller';
import { AccountRolesService } from './services/account-roles.service';

@Module({
  controllers: [AccountRolesController],
  providers: [AccountRolesService],
  exports: [AccountRolesService],
})
export class AccountRolesModule {}