import { Module } from '@nestjs/common';
import { AuthModule } from './auth/AuthModule';
import EntitiesModule from '../entities/EntitiesModule';
import { RouterModule } from 'nest-router';
import routes from './routers';
import { BullModule } from '@nestjs/bull';
import configDatabase from '../config/database';
import { ConfigModule, ConfigService } from '@nestjs/config';
import BcryptModule from './bcrypt/BcryptModule';
import SmsModule from './sms/SmsModule';
import GenerateCodeModule from './gennerate/GenerateCodeModule';
import { FileUploadModule } from './file-upload/file-upload.module';
import { MinioClientModule } from './minio-client/minio-client.module';
import { SendGridModule } from '@anchan828/nest-sendgrid';
import { PlaceOrdersModule } from './place-orders/PlaceOrdersModule';
import { CryptoPriceModule } from './crypto-price/CryptoPriceModule';
import { UserBalanceModule } from './user-balance/UserBalanceModule';
import { WebHookModule } from './webhook/WebHookModule';
import FlockHascherModule from './encrypt-decrypt-library/FlockHasherModule';
import { UserPositionsModule } from './user-position/UserPositionsModule';
import { UserOpenOrderModule } from './user-open-orders/UserOpenOrderModule';
import { UserRankModule } from './user-rank/UserRankModule';
import { ExchangeSymbolsModule } from './exchange-symbols/ExchangeSymbolsModule';
import { PushNotificationModule } from './push-notication/PushNotificationModule';
import { HealthModule } from './health-checks/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { UserJoinedCupModule } from './user-joined-cup/UserJoinedCupModule';
import { VerifyModule } from './verify/VerifyModule';
import { convertURL } from 'helpers/utils';
import { UserTotalProfitModule } from './user-total-profit/UserTotalProfitModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => configDatabase],
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: convertURL(config.get('redis.redis_url')),
      }),
      inject: [ConfigService],
    }),
    SendGridModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        apikey: config.get('mail.api_key'),
      }),
      inject: [ConfigService],
    }),
    RouterModule.forRoutes(routes()),
    FileUploadModule,
    MinioClientModule,
    AuthModule,
    BcryptModule,
    FlockHascherModule,
    SmsModule,
    GenerateCodeModule,
    EntitiesModule,
    PlaceOrdersModule,
    CryptoPriceModule,
    UserRankModule,
    UserBalanceModule,
    WebHookModule,
    VerifyModule,
    UserPositionsModule,
    UserOpenOrderModule,
    ExchangeSymbolsModule,
    PushNotificationModule,
    HealthModule,
    MetricsModule,
    UserJoinedCupModule,
    UserTotalProfitModule,
  ],
})
export default class RootModule {}
