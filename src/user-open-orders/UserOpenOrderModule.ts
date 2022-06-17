import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { QUEUE_SCHEDULED_JOB_UPDATE_OPEN_ORDER } from 'config/secret';
import { ExchangeHelper } from 'helpers/ExchangeHelper';
import { RedisCacheHelper } from 'helpers/RedisCacheHelper';
import { BinanceService } from 'services/BinanceService';
import { BybitService } from 'services/BybitService';
import { FtxService } from 'services/FtxService';
import { TokocryptoService } from 'services/TokocryptoService';
import { UserExchangeKeysService } from 'services/UserExchangeKeysService';
import { UserOpenOrderService } from 'services/UserOpenOrderService';
import { UserOpenOrderController } from './UserOpenOrderController';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_SCHEDULED_JOB_UPDATE_OPEN_ORDER,
    }),
  ],
  controllers: [UserOpenOrderController],
  providers: [
    UserExchangeKeysService,
    FtxService,
    RedisCacheHelper,
    BybitService,
    BinanceService,
    ExchangeHelper,
    TokocryptoService,
    UserOpenOrderService,
  ],
  exports: [UserOpenOrderService],
})
export class UserOpenOrderModule {}
