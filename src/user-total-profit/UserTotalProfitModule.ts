import { Module } from '@nestjs/common';
import { UserExchangeKeysService } from 'services/UserExchangeKeysService';
import { UserService } from 'services/UserService';
import { UserTotalProfitService } from 'services/UserTotalProfitService';
import { UserBalanceModule } from 'src/user-balance/UserBalanceModule';
import { UserPositionsModule } from 'src/user-position/UserPositionsModule';
import { UserTotalProfitController } from './UserTotalProfitController';

@Module({
  imports: [UserBalanceModule, UserPositionsModule],
  providers: [UserTotalProfitService, UserService, UserExchangeKeysService],
  controllers: [UserTotalProfitController],
})
export class UserTotalProfitModule {}
