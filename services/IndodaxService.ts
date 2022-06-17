import { Inject, Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';
import * as moment from 'moment';

// types
import { TExchangeKeyParam } from 'resources/ExchangeKey';
import { HasherProvider } from '../src/encrypt-decrypt-library/HasherProvider';

@Injectable()
export class IndodaxService {
  @Inject('FlockEncrypt')
  private readonly Encrypt: HasherProvider;

  configExchange(key: string, secretKey: string) {
    const exchange = new ccxt.indodax({
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
    return result.info.result.map(({ coin: symbol, total: balanceAmount }) => ({
      symbol,
      balanceAmount,
    }));
  }

  async getUserIncome(exchangeKey: TExchangeKeyParam) {
    const { key, secretKey } = exchangeKey;
    const exchange = this.configExchange(key, secretKey);

    // TODO: Need to add since param
    const since = moment().subtract(1, 'days').valueOf();

    const [withdrawals, deposits] = await Promise.all(
      [exchange.fetchWithdrawals(), exchange.fetchDeposits()].map(async (promise) => {
        const result = await promise;
        return result.map(({ id, amount, currency, fee }: ccxt.Transaction) => ({
          id,
          amount,
          currency,
          fee,
        }));
      }),
    );

    const result = {};

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

    console.log(`result`, result);

    return result;
  }
}
