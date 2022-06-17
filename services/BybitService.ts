/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';
import * as moment from 'moment';
import axios, { Method } from 'axios';
import * as crypto from 'crypto';

import { BYBIT_BASE_URL, IS_DEV } from 'config/secret';
import { TExchangeKeyParam } from 'resources/ExchangeKey';
import { TIncome } from 'resources/UserBalance';
import { EXCHANGES, MARGIN_TYPE } from 'constant';
import { RedisCacheHelper } from 'helpers/RedisCacheHelper';
import { HasherProvider } from '../src/encrypt-decrypt-library/HasherProvider';

const ENDPOINTS = {
  OPEN_POSITION_LIST: '/private/linear/position/list',
  ACTIVE_ORDERS_LIST: '/private/linear/order/list',
  ASSET_TRANSFER_RECORDS: '/asset/v1/private/transfer/list',
};

const WALLET = {
  CONTRACT: 'CONTRACT',
  SPOT: 'SPOT',
  INVESTMENT: 'INVESTMENT', // Byfi account type
};

type TAccountTransferRecord = {
  transfer_id: string;
  coin: string;
  amount: string;
  from_account_type: string;
  to_account_type: string;
  timestamp: number;
  status: string;
  cursor: string;
};

@Injectable()
export class BybitService {
  private baseUrl = BYBIT_BASE_URL;

  constructor(
    @Inject(RedisCacheHelper)
    private readonly redisCacheHelper: RedisCacheHelper,
  ) {}

  @Inject('FlockEncrypt')
  private readonly Encrypt: HasherProvider;

  configBybitExchange(key: string, secretKey: string) {
    const exchange = new ccxt.bybit({
      apiKey: key,
      secret: this.Encrypt.decrypt(secretKey),
      enableRateLimit: true,
      options: {
        defaultType: 'future',
      },
    });

    if (IS_DEV) {
      exchange.set_sandbox_mode(true); // Remove this line when use in production
    }

    return exchange;
  }

  sign(queryString: string, secretKey: string) {
    return crypto.createHmac('sha256', this.Encrypt.decrypt(secretKey)).update(queryString).digest('hex');
  }

  serializeParams = (params = {}, strict_validation = false) => {
    return Object.keys(params)
      .sort()
      .map((key) => {
        const value = params[key];
        if (strict_validation === true && typeof value === 'undefined') {
          throw new Error('Failed to sign API request due to undefined parameter');
        }
        return `${key}=${value}`;
      })
      .join('&');
  };

  async requestPrivate(
    endpoint: string,
    method: Method,
    exchangeKey: TExchangeKeyParam,
    params: any = {},
  ): Promise<any> {
    const { key, secretKey } = exchangeKey;
    if (!key || !secretKey) {
      throw new ccxt.AuthenticationError(`API key and secret key required to use authenticated methods`);
    }
    params.api_key = key;
    const queryString = this.serializeParams(params);
    const signature = this.sign(queryString, secretKey);

    const requestUrl = `${this.baseUrl}${endpoint}?${queryString}&sign=${signature}`;

    const headers = {
      'Content-Type': 'application/json',
    };
    return axios
      .request({
        url: requestUrl,
        method,
        headers,
      })
      .then((response) => response.data);
  }

  /**
   * Fetch user's balance from Bybit exchange
   *
   * @param exchange
   * @returns
   * @example [
   *   { symbol: 'BTC', balanceAmount: '0' },
   *   { symbol: 'EOS', balanceAmount: '0' },
   *   { symbol: 'ETH', balanceAmount: '0' },
   *   { symbol: 'USDT', balanceAmount: '0' },
   *   { symbol: 'XRP', balanceAmount: '0' }
   * ]
   */
  async fetchBalance(exchange: ccxt.Exchange) {
    const result = await exchange.fetchBalance();
    const resultObject = result?.info?.result || {};
    const output = [];
    for (const cryptoSymbol in resultObject) {
      output.push({
        symbol: cryptoSymbol,
        balanceAmount: resultObject[cryptoSymbol].wallet_balance,
      });
    }
    return output;
  }

  isToday(timestamp: number) {
    const now = moment();
    const date = moment(timestamp);
    return now.isSame(date, 'day');
  }

  async getUserIncome(exchangeKey: TExchangeKeyParam): Promise<TIncome> {
    let result = {};

    try {
      const yesterday = moment().subtract(1, 'days').valueOf();

      const params = {
        timestamp: +new Date(),
        // ?? It seems that this param doesn't work??
        start_time: yesterday,
      };

      /**
       * @example response
       * [{
          transfer_id: '8a84b8ba-1bac-4117-9cf3-65bd0d9f8ec6',
          coin: 'USDT',
          amount: '0.1',
          from_account_type: 'SPOT',
          to_account_type: 'CONTRACT',
          timestamp: '1634612643',
          status: 'SUCCESS'
        }]
       */
      const assestExchangeRecordsResponse = await this.requestPrivate(
        ENDPOINTS.ASSET_TRANSFER_RECORDS,
        'GET',
        exchangeKey,
        params,
      );

      const assestExchangeRecords: TAccountTransferRecord[] =
        assestExchangeRecordsResponse?.result?.list?.filter(
          ({ from_account_type, to_account_type, timestamp }: TAccountTransferRecord) => {
            // only accept records which involves CONTRACT account
            return [from_account_type, to_account_type].includes(WALLET.CONTRACT) && this.isToday(timestamp * 1000);
          },
        ) || [];

      result = this.calcDepositAndWithdrawal(assestExchangeRecords);
    } catch (error) {
      console.log(new Date(), 'error with get user income: ', error.message);
    }
    return result;
  }

  calcDepositAndWithdrawal(transferRecords: TAccountTransferRecord[]): TIncome {
    const result = {};
    for (let idx = 0; idx < transferRecords.length; idx++) {
      const { coin = '', from_account_type = '', to_account_type = '', amount = '0' } = transferRecords[idx];

      const transferAmount = parseFloat(amount);

      if (!result.hasOwnProperty(coin)) {
        result[coin] = {
          depositAmount: 0,
          withdrawAmount: 0,
        };
      }

      if (from_account_type === WALLET.CONTRACT) {
        result[coin].withdrawAmount += transferAmount;
      }

      if (to_account_type === WALLET.CONTRACT) {
        result[coin].depositAmount += transferAmount;
      }
    }

    return result;
  }

  positionTranslator(position: any) {
    const type = position?.side?.toLowerCase();

    return {
      exchange: EXCHANGES.BYBIT,
      symbol: position.symbol,
      leverage: position.leverage,
      amount: position.size,
      entry_price: position.entry_price,
      realized_profit: position.realised_pnl || 0,
      unrealized_profit: position.unrealised_pnl,

      isolated_margin: position.is_isolated ? position.entry_price * position.size : null,
      mark_price: null,
      liquidation_price: position.liq_price,
      position_side: type === 'sell' ? 'short' : 'long',
      margin_type: position.is_isolated ? MARGIN_TYPE.ISOLATED : MARGIN_TYPE.CROSSED,
      roe: 0,
      info: JSON.stringify(position),
      total_amount: position.size,
      matched_amount: 0,
      hold: 0,
      is_hedge: true, // in Bybit USDT, we only hedge mode
      status: 'open',
      type,
      update_at: position.updated_at,
      created_at: position.created_at,
      total_value: position.position_value,
    };
  }

  async getPositions(exchangeKey: TExchangeKeyParam) {
    const response = await this.requestPrivate(ENDPOINTS.OPEN_POSITION_LIST, 'GET', exchangeKey, {
      timestamp: +new Date(),
    });

    const positions =
      response?.result
        ?.map((r) => r.data)
        ?.filter((position) => {
          return position?.size > 0;
        })
        ?.map(this.positionTranslator) || [];

    return positions;
  }

  async getSymbols(exchange: ccxt.Exchange) {
    const cachedSymbols: string = await this.redisCacheHelper.get(`${EXCHANGES.BYBIT}_symbols`);

    let symbols: string[] = [];

    try {
      if (!cachedSymbols || (cachedSymbols && JSON.parse(cachedSymbols).length === 0)) {
        const response = await exchange.fetchMarkets();
        symbols = response?.map((r) => r.symbol) || [];

        this.redisCacheHelper.set(`${EXCHANGES.BYBIT}_symbols`, JSON.stringify(symbols));
      } else {
        try {
          symbols = JSON.parse(cachedSymbols);
        } catch (error) {
          console.log('error while parsing cachedSymbol: ', error.message);
        }
      }
    } catch (error) {
      console.log('Error with fetching symbols...: ', error.message);
    }

    return symbols;
  }

  async getOpenOrders(exchange: ccxt.Exchange) {
    const symbols = await this.getSymbols(exchange);

    let openOrderList = [];

    for (let idx = 0; idx < symbols.length; idx++) {
      try {
        const symbol = symbols[idx];

        const promises = [
          exchange.fetchOpenOrders(symbol),
          exchange.fetchOpenOrders(symbol, undefined, undefined, {
            stop_order_status: ['New', 'Created', 'PartiallyFilled', 'Untriggered', 'PendingCancel'],
          }),
        ];

        const fetchSymbolOpenOrdersResponses = await Promise.all(promises);

        const symbolOpenOrders = fetchSymbolOpenOrdersResponses?.reduce((acc, curr) => acc.concat(curr), []) || [];

        openOrderList = openOrderList.concat(symbolOpenOrders);
      } catch (error) {
        console.log(`error`, error);
      }
    }

    return openOrderList;
  }

  async fetchSymbols() {
    const exchange = new ccxt.bybit({
      options: {
        defaultType: 'future',
      },
    });

    return await exchange.fetchMarkets();
  }
}
