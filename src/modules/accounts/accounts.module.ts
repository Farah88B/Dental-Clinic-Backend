import { Module } from '@nestjs/common';
import { AccountsController } from './controllers/accounts.controller';
import { AccountsService } from './services/accounts.service';
import { AccountAdapter } from './adapter/account.adapter';
import { AccountRolesModule } from '../account-roles/account-roles.module';

@Module({
  imports: [AccountRolesModule], // needed for countActiveHoldersOfRole()
  controllers: [AccountsController],
  providers: [AccountsService, AccountAdapter],
  exports: [AccountsService],
})
export class AccountsModule {}