require('dotenv').config();
import configDatabase from '../config/database';
import { Global, Module } from '@nestjs/common';
import User, { UserRepository } from './User';
import { TypeOrmModule } from '@nestjs/typeorm';
import UserExchangesKeys from './UserExchangesKeys';
import { CryptoPrice } from './CryptoPrice';
import { PlaceOrders } from './PlaceOrders';
import { UserBalanceHistory, UserBalanceHistoryRepository } from './UserBalanceHistory';
import { UserFollows } from './UserFollows';
import { UserOrders } from './UserOrders';
import { UserBalanceHistoryDetail } from './UserBalanceHistoryDetail';
import UserPosition, { UserPositionRepository } from './UserPosition';
import { UserOpenOrder, UserOpenOrderRepository } from './UserOpenOrder';
import { ExchangeSymbols } from './ExchangeSymbols';
import { UserJoinedCup, UserJoinedCupRepository } from './UserJoinedCup';
import { Cup, CupRepository } from './Cup';
import { UserTotalProfit, UserTotalProfitRepository } from './UserTotalProfit';

const featureImports = TypeOrmModule.forFeature([
  User,
  UserRepository,
  UserExchangesKeys,
  CryptoPrice,
  PlaceOrders,
  UserBalanceHistory,
  UserBalanceHistoryRepository,
  UserBalanceHistoryDetail,
  UserFollows,
  UserOrders,
  UserPosition,
  UserPositionRepository,
  UserOpenOrder,
  UserOpenOrderRepository,
  ExchangeSymbols,
  UserJoinedCup,
  UserJoinedCupRepository,
  Cup,
  CupRepository,
  UserTotalProfit,
  UserTotalProfitRepository,
]);

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...configDatabase.database,
      synchronize: false,
      entities: [
        User,
        UserExchangesKeys,
        CryptoPrice,
        PlaceOrders,
        UserBalanceHistory,
        UserBalanceHistoryDetail,
        UserFollows,
        UserOrders,
        UserPosition,
        UserOpenOrder,
        ExchangeSymbols,
        UserJoinedCup,
        Cup,
        UserTotalProfit,
      ],
      migrations: ['migration/**/*{.ts, .js}'],
      subscribers: ['subscriber/**/*{.ts, .js}'],
    }),
    featureImports,
  ],

  exports: [featureImports],
})
export default class EntitiesModule {}
