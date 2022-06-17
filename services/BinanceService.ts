/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import * as ccxt from 'ccxt';
import axios from 'axios';
import * as crypto from 'crypto';
import * as moment from 'moment';
import { Connection } from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';
import { BINANCE_BASE_URL, IS_DEV } from 'config/secret';
import qs = require('qs');
import { TExchangeKeyParam } from 'resources/ExchangeKey';
import { EXCHANGES } from 'constant';
import ccxtpro = require('ccxt.pro');
import { HasherProvider } from '../src/encrypt-decrypt-library/HasherProvider';

@Injectable()
export class BinanceService {
  private baseUrl: string;
  private connection: Connection;

  constructor(@InjectConnection() connection: Connection) {
    this.baseUrl = BINANCE_BASE_URL;
    this.connection = connection;
  }

  @Inject('FlockEncrypt')
  private readonly Encrypt: HasherProvider;

  async configBinanceExchange(key: string, secretKey: string) {
    const exchange = new ccxt.binance({
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

  /**
   * Fetch user's balance from Binance exchange
   *
   * @param exchange
   * @returns
   * @example [
   *   { symbol: 'USDT', balanceAmount: '100000.00000000' },
   *   { symbol: 'BUSD', balanceAmount: '0.00000000' }
   * ]
   */
  async fetchBalance(exchange: ccxt.Exchange) {
    const fetchResult = await exchange.fetchBalance();

    return fetchResult.info.assets.map(({ asset: symbol, marginBalance: balanceAmount }) => ({
      symbol,
      balanceAmount,
    }));
  }

  async callApiGetWithSignature(requestUrl: string, params: any, apiKey: string, signature: string) {
    params['signature'] = signature;
    const config = {
      params: params,
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    };
    return new Promise(function (resolve, reject) {
      axios
        .get(requestUrl, config)
        .then(function (response) {
          resolve(response.data);
        })
        .catch(function (err) {
          // console.log(`err`, err);
          reject(err?.response?.data?.message);
        });
    });
  }

  sign(data: any, secretKey: string) {
    const dataString = qs.stringify(data);
    return crypto.createHmac('sha256', this.Encrypt.decrypt(secretKey)).update(dataString).digest('hex');
  }

  async getUserIncome(keys) {
    try {
      const now = moment();
      const subdayFromNow = moment().subtract(1, 'day');

      const url = `${this.baseUrl}/fapi/v1/income`;
      const params = {
        incomeType: 'TRANSFER',
        startTime: subdayFromNow.valueOf(),
        endTime: now.valueOf(),
        limit: 1000,
        timestamp: Date.now(),
        recvWindow: 5000,
      };
      const signature = this.sign(params, keys.secret);

      const apiResult = await this.callApiGetWithSignature(url, params, keys.key, signature);

      return this.calcDepositAndWithdrawal(apiResult);
    } catch (error) {
      console.log('error get user income histories', error);
      return undefined;
    }
  }

  calcDepositAndWithdrawal(transactions) {
    const result = {};
    if (transactions.length === 0) {
      return result;
    }
    for (const transation of transactions) {
      if (result[transation.asset] == undefined) {
        result[transation.asset] = {
          depositAmount: 0,
          withdrawAmount: 0,
        };
      }
      if (transation.income > 0) {
        result[transation.asset].depositAmount += parseFloat(transation.income);
      }
      if (transation.income < 0) {
        result[transation.asset].withdrawAmount += Math.abs(parseFloat(transation.income));
      }
    }
    return result;
  }

  positionTranslator(position: any) {
    const position_side = position?.positionSide?.toLowerCase() || '';

    const positionAmount = position?.positionAmt ? Math.abs(position.positionAmt) : 0;

    let position_type = '';

    if (position_side !== 'both') {
      if (position_side === 'long') {
        position_type = 'buy';
      } else {
        position_type = 'sell';
      }
    } else {
      if (position?.positionAmt > 0) {
        position_type = 'buy';
      } else {
        position_type = 'sell';
      }
    }

    return {
      exchange: EXCHANGES.BINANCE,
      symbol: position.symbol,
      leverage: position.leverage,
      amount: positionAmount,
      entry_price: position.entryPrice,
      realized_profit: position.realizedProfit,
      unrealized_profit: position.unRealizedProfit,
      isolated_margin: position.isolatedMargin,
      mark_price: position.markPrice,
      liquidation_price: position.liquidationPrice,
      position_side,
      margin_type: position.marginType,
      info: JSON.stringify(position),
      roe: 0,
      total_amount: positionAmount,
      matched_amount: 0,
      hold: 0,
      is_hedge: position_side !== 'both',
      status: 'open',
      type: position_type,
      update_at: position.updateTime,
      total_value: positionAmount * position.entryPrice,
    };
  }

  async getPositions(exchangeKey: TExchangeKeyParam) {
    const url = `${this.baseUrl}/fapi/v2/positionRisk`;
    const params = {
      timestamp: Date.now(),
      recvWindow: 10000000, // to get rid of "request is outside of recvWindow"
    };
    const signature = this.sign(params, exchangeKey.secretKey);
    const response: any = await this.callApiGetWithSignature(url, params, exchangeKey.key, signature);

    const positions =
      (response as any)?.filter((position) => position?.positionAmt != 0)?.map(this.positionTranslator) || [];

    return positions;
  }

  async getOpenOrders(exchange: ccxt.Exchange) {
    const response = await exchange.fetchOpenOrders();

    return response;
  }

  async fetchSymbols() {
    const exchange = new ccxtpro.binance({
      options: {
        defaultType: 'future',
      },
    });
    return await exchange.fetchMarkets();
  }
}
