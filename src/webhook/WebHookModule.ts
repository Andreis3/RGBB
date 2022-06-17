import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebHookController } from './WebHookController';
import { WebHookService } from '../../services/WebHookService';
import { RedisCacheHelper } from '../../helpers/RedisCacheHelper';
import { UserOpenOrderModule } from 'src/user-open-orders/UserOpenOrderModule';
import { UserPositionsModule } from 'src/user-position/UserPositionsModule';
import { UserJoinedCupService } from 'services/UserJoinedCupService';
import { BullModule } from '@nestjs/bull/dist/bull.module';
import { UserPositionsService } from '../../services/UserPositionsService';
import { UserOpenOrderService } from '../../services/UserOpenOrderService';
import { UserOpenOrder } from '../../entities/UserOpenOrder';
import UserPosition from '../../entities/UserPosition';
import { UserExchangeKeysService } from '../../services/UserExchangeKeysService';
import { ExchangeHelper } from '../../helpers/ExchangeHelper';
import { BinanceService } from '../../services/BinanceService';
import { BybitService } from '../../services/BybitService';
import { FtxService } from '../../services/FtxService';
import { TokocryptoService } from '../../services/TokocryptoService';
import { QUEUE_SCHEDULED_JOB_PUSH_NOTIFICAION } from '../../config/secret';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: `${process.env.REDIS_PREFIX}_COPY_TRADING`,
      },
      {
        name: `${QUEUE_SCHEDULED_JOB_PUSH_NOTIFICAION}`,
      },
    ),
    TypeOrmModule.forFeature([]),
    UserOpenOrderModule,
    UserPositionsModule,
  ],
  controllers: [WebHookController],
  providers: [
    WebHookService,
    RedisCacheHelper,
    UserJoinedCupService,
    UserExchangeKeysService,
    ExchangeHelper,
    BinanceService,
    BybitService,
    FtxService,
    TokocryptoService,
  ],
})
export class WebHookModule {}
