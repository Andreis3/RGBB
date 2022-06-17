import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { TOKOCRYPTO_BASE_URL } from 'config/secret';
import * as crypto from 'crypto';
import * as moment from 'moment';
const qs = require('qs');

@Injectable()
export class TokocryptoService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = TOKOCRYPTO_BASE_URL;
  }

  async callApiGetWithSignature(requestUrl: string, params: object, apiKey: string, signature: string) {
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
          reject(err.response.data.message);
        });
    });
  }

  sign(data: object, secretKey: string) {
    const dataString = qs.stringify(data);
    return crypto.createHmac('sha256', secretKey).update(dataString).digest('hex');
  }

  async fetchBalance(keys) {
    try {
      const url = this.baseUrl + '/open/v1/account/spot';
      const params = {
        timestamp: Date.now(),
        recvWindow: 5000,
      };
      const signature = this.sign(params, keys.secret);

      const apiResult = await this.callApiGetWithSignature(url, params, keys.key, signature);
      return this.exportBalanceData(apiResult);
    } catch (error) {
      throw error;
    }
  }

  async exportBalanceData(apiResult) {
    const balanceData = apiResult.data.accountAssets;
    const output = [];
    for (const index in balanceData) {
      output.push({
        symbol: balanceData[index].asset,
        balanceAmount: parseFloat(balanceData[index].free) + +parseFloat(balanceData[index].locked),
      });
    }
    return output;
  }

  async placeOrder(order, apiKey) {
    let data: any = {
      timestamp: Date.now(),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
    };

    switch (order.type) {
      case 7:
      case 1: {
        data = {
          ...data,
          quantity: order.amount,
          price: order.price,
        };

        break;
      }

      case 2: {
        if (order.side == 0) {
          data = {
            ...data,
            quantity: order.amount,
          };
        } else {
          data = {
            ...data,
            quoteOrderQty: order.amount,
          };
        }
        break;
      }

      case 5:
      case 3: {
        data = {
          ...data,
          quantity: order.amount,
          stopPrice: null,
        };

        break;
      }

      case 6:
      case 4: {
        data = {
          ...data,
          quantity: order.amount,
          price: order.price,
          stopPrice: null,
        };

        break;
      }
    }

    const queryString = qs.stringify(data);
    const signature = this.sign(data, apiKey.secretKey);

    return await axios.post(`${this.baseUrl}/open/v1/orders?${queryString}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': apiKey.key,
      },
    });
  }

  async getUserIncome(keys) {
    const depositTrans = await this.callYesterdayTransaction(keys, 'deposit');
    const withdrawalTrans = await this.callYesterdayTransaction(keys, 'withdrawal');
    return this.combineData(depositTrans, withdrawalTrans);
  }

  async callYesterdayTransaction(keys, type) {
    const now = moment().valueOf();
    const subdayFromNow = moment().subtract(1, 'day').valueOf();
    if (type === 'deposit') {
      const url = this.baseUrl + '/open/v1/deposits';
      return await this.getTransactions(keys, url, subdayFromNow, now);
    }
    if (type === 'withdrawal') {
      const url = this.baseUrl + '/open/v1/withdraws';
      return await this.getTransactions(keys, url, subdayFromNow, now);
    }
  }

  async getTransactions(keys, url, startTime, endTime) {
    try {
      const params = {
        startTime: startTime,
        endTime: endTime,
        timestamp: Date.now(),
        recvWindow: 5000,
      };
      const signature = this.sign(params, keys.secret);

      const apiResult = await this.callApiGetWithSignature(url, params, keys.key, signature);
      return apiResult;
    } catch (e) {
      console.log('Get tokocrypto transaction error, url:', url);
      console.log(e);
    }
  }

  combineData(depositTrans, withdrawalTrans) {
    const result = {};
    for (const transation of depositTrans.data.list) {
      if (result[transation.asset] === undefined) {
        result[transation.asset] = {
          depositAmount: 0,
          withdrawAmount: 0,
        };
      }
      result[transation.asset].depositAmount += parseFloat(transation.amount);
    }
    for (const transation of withdrawalTrans.data.list) {
      if (result[transation.asset] === undefined) {
        result[transation.asset] = {
          depositAmount: 0,
          withdrawAmount: 0,
        };
      }
      result[transation.asset].withdrawAmount += parseFloat(transation.amount);
    }
    return result;
  }
}
