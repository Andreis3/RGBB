import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoPrice, User, UserBalanceHistory, UserExchangesKeys } from '../../entities';
import { UserBalanceController } from './UserBalanceController';
import { CryptoPriceService } from '../../services/CryptoPriceService';
import { UserService } from '../../services/UserService';
import { UserExchangeKeysService } from '../../services/UserExchangeKeysService';
import { UserBalanceService } from '../../services/UserBalanceService';
import { FtxService } from '../../services/FtxService';
import { BybitService } from '../../services/BybitService';
import { TokocryptoService } from '../../services/TokocryptoService';
import { RedisCacheHelper } from '../../helpers/RedisCacheHelper';
import { ExchangeHelper } from '../../helpers/ExchangeHelper';
import { BinanceService } from '../../services/BinanceService';
import { UserBalanceHistoryDetail } from 'entities/UserBalanceHistoryDetail';
import { BullModule } from '@nestjs/bull';
import { UserJoinedCupService } from 'services/UserJoinedCupService';
import { UserJoinedCup } from 'entities/UserJoinedCup';

@Module({
  imports: [
    BullModule.registerQueue({
      name: `${process.env.REDIS_PREFIX}_QUEUE_UPDATE_BALANCE`,
    }),
    TypeOrmModule.forFeature([
      CryptoPrice,
      User,
      UserBalanceHistory,
      UserBalanceHistoryDetail,
      UserExchangesKeys,
      UserJoinedCup,
    ]),
  ],
  controllers: [UserBalanceController],
  providers: [
    CryptoPriceService,
    UserService,
    UserExchangeKeysService,
    UserBalanceService,
    FtxService,
    BybitService,
    TokocryptoService,
    RedisCacheHelper,
    ExchangeHelper,
    BinanceService,
    UserJoinedCupService,
  ],
  exports: [UserBalanceService],
})
export class UserBalanceModule {}
