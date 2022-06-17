import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { QUEUE_SCHEDULED_JOB_UPDATE_POSITION } from 'config/secret';
import { ExchangeHelper } from 'helpers/ExchangeHelper';
import { RedisCacheHelper } from 'helpers/RedisCacheHelper';
import { BinanceService } from 'services/BinanceService';
import { BybitService } from 'services/BybitService';
import { FtxService } from 'services/FtxService';
import { TokocryptoService } from 'services/TokocryptoService';
import { UserExchangeKeysService } from 'services/UserExchangeKeysService';
import { UserPositionsService } from 'services/UserPositionsService';
import { UserPositionController } from './UserPositionController';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_SCHEDULED_JOB_UPDATE_POSITION,
    }),
  ],
  controllers: [UserPositionController],
  providers: [
    UserExchangeKeysService,
    FtxService,
    BybitService,
    BinanceService,
    ExchangeHelper,
    TokocryptoService,
    UserPositionsService,
    RedisCacheHelper,
  ],
  exports: [UserPositionsService],
})
export class UserPositionsModule {}
