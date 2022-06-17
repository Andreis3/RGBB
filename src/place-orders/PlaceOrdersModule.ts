import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaceOrders, UserExchangesKeys, UserFollows, UserOrders } from '../../entities';
import { PlaceOrdersController } from './PlaceOrdersController';
import { PlaceOrdersService } from '../../services/PlaceOrdersService';
import { UserExchangeKeysService } from '../../services/UserExchangeKeysService';
import { BinanceService } from '../../services/BinanceService';
import { UserFollowsService } from '../../services/UserFollowsService';
import { BybitService } from '../../services/BybitService';
import { FtxService } from '../../services/FtxService';
import { UserOrdersService } from '../../services/UserOrdersService';
import { TokocryptoService } from '../../services/TokocryptoService';
import { RedisCacheHelper } from 'helpers/RedisCacheHelper';

@Module({
  imports: [TypeOrmModule.forFeature([PlaceOrders, UserExchangesKeys, UserFollows, UserOrders])],
  controllers: [PlaceOrdersController],
  providers: [
    PlaceOrdersService,
    UserExchangeKeysService,
    UserFollowsService,
    BinanceService,
    BybitService,
    FtxService,
    UserOrdersService,
    TokocryptoService,
    RedisCacheHelper,
  ],
  exports: [TypeOrmModule],
})
export class PlaceOrdersModule {}
