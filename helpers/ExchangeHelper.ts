import { Inject, Injectable } from '@nestjs/common';
import { BinanceService } from 'services/BinanceService';
import { FtxService } from 'services/FtxService';
import { BybitService } from 'services/BybitService';
import { TokocryptoService } from 'services/TokocryptoService';
import { EXCHANGES } from '../constant';
import { TExchangeKeyParam } from 'resources/ExchangeKey';

@Injectable()
export class ExchangeHelper {
  private binanceService: BinanceService;
  private ftxService: FtxService;
  private bybitService: BybitService;
  private tokocryptoService: TokocryptoService;

  constructor(
    @Inject(BinanceService) binanceService: BinanceService,
    @Inject(FtxService) ftxService: FtxService,
    @Inject(BybitService) bybitService: BybitService,
    @Inject(TokocryptoService) tokocryptoService: TokocryptoService,
  ) {
    this.binanceService = binanceService;
    this.ftxService = ftxService;
    this.bybitService = bybitService;
    this.tokocryptoService = tokocryptoService;
  }

  async configExchange(exchangeName: string, key: string, secretKey: string) {
    let exchange = undefined;
    if (exchangeName === EXCHANGES.BINANCE) {
      exchange = await this.binanceService.configBinanceExchange(key, secretKey);
    }
    if (exchangeName === EXCHANGES.FTX) {
      exchange = this.ftxService.configFtxExchange(key, secretKey);
    }
    if (exchangeName === EXCHANGES.BYBIT) {
      exchange = this.bybitService.configBybitExchange(key, secretKey);
    }
    return exchange;
  }

  async fetchBalance(exchangeName: string, key: string, secretKey: string) {
    try {
      if (exchangeName === EXCHANGES.TOKOCRYPTO) {
        return await this.tokocryptoService.fetchBalance({
          key: key,
          secret: secretKey,
        });
      }
      const exchange = await this.configExchange(exchangeName, key, secretKey);
      if (exchange) {
        if (exchangeName === EXCHANGES.BINANCE) {
          return await this.binanceService.fetchBalance(exchange);
        }
        if (exchangeName === EXCHANGES.FTX) {
          return await this.ftxService.fetchBalance(exchange);
        }
        if (exchangeName === EXCHANGES.BYBIT) {
          return await this.bybitService.fetchBalance(exchange);
        }
        return undefined;
      } else {
        return undefined;
      }
    } catch (e) {
      console.log('Fetch balance error', e);
      return undefined;
    }
  }

  async getUserIncome(exchangeName: string, key: string, secretKey: string) {
    if (exchangeName === EXCHANGES.BINANCE) {
      return await this.binanceService.getUserIncome({
        key: key,
        secret: secretKey,
      });
    }
    if (exchangeName === EXCHANGES.FTX) {
      return await this.ftxService.getUserIncome({
        key: key,
        secretKey,
      });
    }
    if (exchangeName === EXCHANGES.BYBIT) {
      return await this.bybitService.getUserIncome({
        key: key,
        secretKey,
      });
    }
    if (exchangeName === EXCHANGES.TOKOCRYPTO) {
      return await this.tokocryptoService.getUserIncome({
        key: key,
        secret: secretKey,
      });
    }
  }

  async fetchPositions(exchangeName: string, key: string, secretKey: string) {
    try {
      const exchangeKey: TExchangeKeyParam = {
        key,
        secretKey,
      };

      if (exchangeName === EXCHANGES.BINANCE) {
        return await this.binanceService.getPositions(exchangeKey);
      }

      if (exchangeName === EXCHANGES.BYBIT) {
        return await this.bybitService.getPositions(exchangeKey);
      }

      const exchange = await this.configExchange(exchangeName, key, secretKey);

      if (exchange) {
        if (exchangeName === EXCHANGES.FTX) {
          return await this.ftxService.getPositions(exchange);
        }

        return [];
      }
    } catch (error) {
      console.log(new Date(), `error fetchPositions ${exchangeName}`, error);
    }
    return [];
  }

  async fetchOpenOrders(exchangeName: string, key: string, secretKey: string) {
    try {
      const exchange = await this.configExchange(exchangeName, key, secretKey);

      if (exchange) {
        exchange.options['warnOnFetchOpenOrdersWithoutSymbol'] = false;

        switch (exchangeName) {
          case EXCHANGES.BINANCE:
            return await this.binanceService.getOpenOrders(exchange);
          case EXCHANGES.FTX:
            return await this.ftxService.getOpenOrders(exchange);
          case EXCHANGES.BYBIT:
            return await this.bybitService.getOpenOrders(exchange);
        }

        return [];
      }
    } catch (error) {
      console.log(new Date(), `error fetchOpenOrders ${exchangeName}`, error);
    }
  }
}
