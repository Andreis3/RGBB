import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { ExchangeSymbols, ExchangeSymbolsRepository } from '../entities/ExchangeSymbols';
import { BinanceService } from './BinanceService';
import { BybitService } from './BybitService';
import { FtxService } from './FtxService';
import { EXCHANGES, LIST_EXCHANGE_FETCH_SYMBOLS } from '../constant';

@Injectable()
export class ExchangeSymbolsService {
  // @ts-ignore
  @InjectConnection()
  private connection: Connection;

  @InjectRepository(ExchangeSymbols)
  private exchangeSymbolsRepository: ExchangeSymbolsRepository;

  @Inject()
  private binanceService: BinanceService;

  @Inject()
  private bybitService: BybitService;

  @Inject()
  private ftxService: FtxService;

  async updateSymbols() {
    const promiseAll = LIST_EXCHANGE_FETCH_SYMBOLS.map((item) => {
      return this.updateData(item);
    });

    try {
      await Promise.all(promiseAll);
      return true;
    } catch (e) {
      return false;
    }
  }

  async updateData(exchangeName: string) {
    let data;

    switch (exchangeName) {
      case EXCHANGES.BINANCE: {
        data = await this.binanceService.fetchSymbols();
        break;
      }

      case EXCHANGES.BYBIT: {
        data = await this.bybitService.fetchSymbols();
        break;
      }

      case EXCHANGES.FTX: {
        data = await this.ftxService.fetchSymbols();
        break;
      }
    }

    const dataSave = data?.map((item: any) => {
      const exchangeSymbols = new ExchangeSymbols();

      exchangeSymbols.exchange = exchangeName;
      exchangeSymbols.symbol = item.id;
      exchangeSymbols.token = item.base;
      exchangeSymbols.quoteToken = item.quote;

      return exchangeSymbols;
    });

    await this.connection.transaction(async (manager) => {
      await manager.save(dataSave);
    });
  }
}
