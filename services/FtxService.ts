/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { EXCHANGES } from 'constant';
import * as moment from 'moment';
import { TExchangeKeyParam } from 'resources/ExchangeKey';
import { TIncome } from 'resources/UserBalance';
import { HasherProvider } from '../src/encrypt-decrypt-library/HasherProvider';

@Injectable()
export class FtxService {
  @Inject('FlockEncrypt')
  private readonly Encrypt: HasherProvider;

  configFtxExchange(key: string, secretKey: string) {
    const exchange = new ccxt.ftx({
      apiKey: key,
      secret: this.Encrypt.decrypt(secretKey),
      enableRateLimit: true,
    });
    return exchange;
  }

  /**
   * Fetch user's balance from Ftx exchange
   *
   * @param exchange
   * @returns
   * @example [
   *   { symbol: 'USD', balanceAmount: '100.0' },
   *   { symbol: 'FTT', balanceAmount: '0.0' }
   * ]
   */
  async fetchBalance(exchange: ccxt.Exchange) {
    const result = await exchange.fetchBalance();

    // console.log('result fetchBalance FTX ', result);

    return (
      result?.info?.result?.map(({ coin: symbol, total: balanceAmount }) => ({
        symbol,
        balanceAmount,
      })) || []
    );
  }

  async getUserIncome(exchangeKey: TExchangeKeyParam): Promise<TIncome> {
    const result = {};

    try {
      const { key, secretKey } = exchangeKey;
      const exchange = this.configFtxExchange(key, secretKey);

      const since = moment().subtract(1, 'days').valueOf();

      const [withdrawals, deposits] = await Promise.all(
        [exchange.fetchWithdrawals(undefined, since), exchange.fetchDeposits(undefined, since)].map(async (promise) => {
          const result = await promise;
          return result.map(({ id, amount, currency, fee }: ccxt.Transaction) => ({
            id,
            amount,
            currency,
            fee,
          }));
        }),
      );

      withdrawals.forEach((withdrawal) => {
        const { amount, currency, fee } = withdrawal;
        if (result[currency] === undefined) {
          result[currency] = { withdrawAmount: 0, depositAmount: 0 };
        }
        result[currency].withdrawAmount += amount - (fee?.cost || 0);
      });

      deposits.forEach((deposit) => {
        const { amount, currency, fee } = deposit;
        if (result[currency] === undefined) {
          result[currency] = { withdrawAmount: 0, depositAmount: 0 };
        }
        result[currency].depositAmount += amount - (fee?.cost || 0);
      });

      // console.log(`result getUserIncome Ftx`, result);
    } catch (error) {
      console.log(new Date(), 'error in getUserIncome FTX ', error.message);
    }
    return result;
  }

  positionTranslator(position: any) {
    const { info } = position;

    const position_side = position?.side?.toLowerCase() || '';
    const entryPrice = position.entryPrice || info.entryPrice || 0;

    return {
      exchange: EXCHANGES.FTX,
      symbol: info.symbol || info.future,
      leverage: position.leverage,
      amount: info.size,
      entry_price: entryPrice,
      realized_profit: info.realizedPnl || 0,
      unrealized_profit: position.unrealizedPnl,
      mark_price: position.markPrice,
      liquidation_price: position.liquidationPrice,
      position_side: 'both',
      isolated_margin: null,
      margin_type: position.marginType,
      info: (position && JSON.stringify(position)) || '',
      roe: 0,
      total_amount: info.size,
      matched_amount: 0,
      hold: 0,
      is_hedge: false, // in FTX, we don't have hedge mode
      status: 'open',
      type: position_side === 'short' ? 'sell' : 'buy',
      total_value: info.size * entryPrice,
      update_at: new Date(),
    };
  }

  async getPositions(exchange: ccxt.Exchange): Promise<any> {
    const response = await exchange.fetchPositions();
    const positions =
      response
        ?.filter((position) => {
          return position?.info?.size > 0;
        })
        ?.map(this.positionTranslator) || [];

    return positions;
  }

  async getOpenOrders(exchange: ccxt.Exchange): Promise<any> {
    const promises = [
      exchange.fetchOpenOrders(),
      exchange.fetchOpenOrders(undefined, undefined, undefined, {
        type: 'stop',
      }),
    ];

    const fetchOpenOrdersResponses = await Promise.all(promises);

    const openOrders = fetchOpenOrdersResponses.reduce((acc, curr) => acc.concat(curr), []) || [];

    return openOrders;
  }

  async fetchSymbols() {
    const exchange = new ccxt.ftx({
      enableRateLimit: true,
      options: {
        defaultType: 'future',
      },
    });

    return await exchange.fetchMarkets();
  }
}
