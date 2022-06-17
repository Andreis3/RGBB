import { Module } from '@nestjs/common';
import { ExchangeSymbolsController } from './ExchangeSymbolsController';
import { ExchangeSymbolsService } from '../../services/ExchangeSymbolsService';
import { ExchangeSymbolsRepository } from '../../entities/ExchangeSymbols';
import { BinanceService } from '../../services/BinanceService';
import { BybitService } from '../../services/BybitService';
import { FtxService } from '../../services/FtxService';
import { RedisCacheHelper } from '../../helpers/RedisCacheHelper';

@Module({
  imports: [],
  controllers: [ExchangeSymbolsController],
  providers: [
    ExchangeSymbolsService,
    ExchangeSymbolsRepository,
    BinanceService,
    BybitService,
    FtxService,
    RedisCacheHelper,
  ],
})
export class ExchangeSymbolsModule {}
