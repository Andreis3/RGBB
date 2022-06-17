import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { PlaceOrders } from '../entities/PlaceOrders';
import { UserExchangeKeysService } from './UserExchangeKeysService';
import { UserFollowsService } from './UserFollowsService';
import { BinanceService } from './BinanceService';
import {
  EXCHANGES,
  NUMBER_OF_REPLACE_ORDER,
  ORDER_STATUS,
  ORDER_TYPE,
  PLACE_ORDER_STATUS,
  RECV_WINDOW,
} from '../constant';
import { BybitService } from './BybitService';
import { FtxService } from './FtxService';
import { UserOrdersService } from './UserOrdersService';
import { TokocryptoService } from './TokocryptoService';
import { ExchangeError, ExchangeNotAvailable, RequestTimeout } from 'ccxt';

@Injectable()
export class PlaceOrdersService {
  @InjectRepository(PlaceOrders)
  private placeOrdersRepository: Repository<PlaceOrders>;

  // @ts-ignore
  @InjectConnection()
  private connection: Connection;

  @Inject(UserExchangeKeysService)
  private userExchangeKeysService: UserExchangeKeysService;

  @Inject(UserFollowsService)
  private userFollowsService: UserFollowsService;

  @Inject(BinanceService)
  private binanceService: BinanceService;

  @Inject(BybitService)
  private bybitService: BybitService;

  @Inject(FtxService)
  private ftxService: FtxService;

  @Inject(UserOrdersService)
  private userOrdersService: UserOrdersService;

  @Inject(TokocryptoService)
  private tokocryptoService: TokocryptoService;

  async createMany(placeOrders: PlaceOrders[]) {
    await this.connection.transaction(async (manager) => {
      await manager.save(placeOrders);
    });
  }

  async copyTrades(params) {
    const leaderKeyInfo = await this.userExchangeKeysService.findByApiKey(params.apiKey);
    if (leaderKeyInfo.length === 0) {
      return false;
    }

    const userApiIds = await this.userFollowsService.findByLeaderKeyId(leaderKeyInfo?.[0].id);
    if (userApiIds.length === 0) {
      return false;
    }

    const userApiKeys = await this.userExchangeKeysService.findByListIdIn(userApiIds.map((item) => item.keyId));
    const order = await this.userOrdersService.findByOrderIdAndUserIdAndDateTime(
      params.orderId,
      params.userId,
      params.dateTime,
      params.exchange,
      params.id,
    );

    if (order === null || order === undefined) {
      return false;
    }

    if (order.status?.toUpperCase() === ORDER_STATUS.NEW || order.status?.toUpperCase() === ORDER_STATUS.FILLED) {
      return await this.placeOrders(leaderKeyInfo, order, userApiKeys, params);
    } else if (order.status?.toUpperCase() === ORDER_STATUS.CANCELED) {
      return await this.cancelOrders(leaderKeyInfo, order, userApiKeys, params);
    }
  }

  async cancelOrders(leaderKeyInfo, order, apiKeys, params) {
    const orderCancels = await this.connection.query(
      `select * from place_orders where leader_order_id = '${order.orderId}' and leader_key_id = '${leaderKeyInfo?.[0].id}'`,
    );

    for (const item of orderCancels) {
      const apiKey = apiKeys.filter((it) => it.id === item.user_key_id);
      if (item.exchange_order_id === null) {
        continue;
      }

      const exchange = await this.createExchange(params.exchange, apiKey?.[0]);
      let i = 0;
      while (i <= NUMBER_OF_REPLACE_ORDER) {
        try {
          await exchange.cancelOrder(`${item.exchange_order_id}_${order.symbol}_BOTH`, order.symbol, {
            orderId: item.exchange_order_id,
            recvWindow: RECV_WINDOW,
            timeInForce: order.timeInForce,
          });
          break;
        } catch (e) {
          console.log('Cancel order error: ', e);
          if (e instanceof RequestTimeout || e instanceof ExchangeNotAvailable || e instanceof ExchangeError) {
            i++;
            await this.delay(1000);
            continue;
          }

          break;
        }
      }
    }

    return true;
  }

  async placeOrders(leaderKeyInfo, order, apiKeys, params) {
    const dataSaves = [];

    for (const item of apiKeys) {
      let i = 0;
      if (params.exchange === EXCHANGES.TOKOCRYPTO) {
        try {
          const response = await this.tokocryptoService.placeOrder(order, item);
          dataSaves.push(this.saveOrder(order, PLACE_ORDER_STATUS.SUCCESS, item, params, leaderKeyInfo, response));
        } catch (e) {
          dataSaves.push(this.saveOrder(order, PLACE_ORDER_STATUS.FAILED, item, params, leaderKeyInfo, null));
        }
      } else {
        while (i <= NUMBER_OF_REPLACE_ORDER) {
          try {
            const response = await this.placeOrderUsingCcxt(params, order, item);
            dataSaves.push(this.saveOrder(order, PLACE_ORDER_STATUS.SUCCESS, item, params, leaderKeyInfo, response));
            break;
          } catch (e) {
            console.log('place order failed: ', e);
            if (e instanceof RequestTimeout || e instanceof ExchangeNotAvailable) {
              i++;
              await this.delay(1000);
              if (i === NUMBER_OF_REPLACE_ORDER) {
                dataSaves.push(this.saveOrder(order, PLACE_ORDER_STATUS.FAILED, item, params, leaderKeyInfo, null));
              }

              continue;
            }

            dataSaves.push(this.saveOrder(order, PLACE_ORDER_STATUS.FAILED, item, params, leaderKeyInfo, null));
            break;
          }
        }
      }
    }

    await this.createMany(dataSaves);
    return true;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async placeOrderUsingCcxt(params, order, apikey) {
    const exchange = await this.createExchange(params.exchange, apikey);

    const orderType = order.type;
    const orderSide = order.side;

    switch (orderType.toString().toUpperCase()) {
      case ORDER_TYPE.LIMIT: {
        return exchange.createOrder(order.symbol, orderType, orderSide, order.amount, order.price, {
          timeInForce: order.timeInForce,
          recvWindow: RECV_WINDOW,
        });
      }

      case ORDER_TYPE.MARKET: {
        return exchange.createOrder(order.symbol, orderType, orderSide, order.amount);
      }

      case ORDER_TYPE.STOP:
      case ORDER_TYPE.TAKE_PROFIT: {
        return exchange.createOrder(order.symbol, orderType, orderSide, order.amount, order.stopPrice, {
          stopPrice: order.stopPrice,
          recvWindow: RECV_WINDOW,
          timeInForce: order.timeInForce,
        });
      }

      case ORDER_TYPE.STOP_MARKET:
      case ORDER_TYPE.TAKE_PROFIT_MARKET: {
        let params: any = {
          stopPrice: order.stopPrice,
          recvWindow: RECV_WINDOW,
          timeInForce: order.timeInForce,
        };

        if (order.amount == 0) {
          params = {
            ...params,
            closePosition: true,
          };
        }

        return exchange.createOrder(order.symbol, orderType, orderSide, order.amount, order.stopPrice, params);
      }

      case ORDER_TYPE.TRAILING_STOP_MARKET: {
        return exchange.createOrder(order.symbol, orderType, orderSide, order.amount, order.activationPrice, {
          activationPrice: order.activationPrice,
          callbackRate: order.callbackRate,
          recvWindow: RECV_WINDOW,
          timeInForce: order.timeInForce,
        });
      }
    }
  }

  async createExchange(exchange, apikey) {
    switch (exchange) {
      case EXCHANGES.BINANCE: {
        return await this.binanceService.configBinanceExchange(apikey.key, apikey.secretKey);
      }

      case EXCHANGES.FTX: {
        return this.ftxService.configFtxExchange(apikey.key, apikey.secretKey);
      }

      case EXCHANGES.BYBIT: {
        return this.bybitService.configBybitExchange(apikey.key, apikey.secretKey);
      }
    }
  }

  saveOrder(order, status, userApiKey, data, leaderKeyInfo, response) {
    const placeOrder = new PlaceOrders();

    placeOrder.symbol = order.symbol;
    placeOrder.side = order.side;
    placeOrder.positionSide = 'BOTH';
    placeOrder.type = order.type;

    placeOrder.exchange = data.exchange;
    placeOrder.quantity = order.amount;
    placeOrder.placeType = 'order-form';

    placeOrder.price = order?.price ? order.price : null;
    placeOrder.timeInForce = order?.timeInForce ? order.timeInForce : null;
    placeOrder.status = status;
    placeOrder.userId = userApiKey.userId;
    placeOrder.leaderOrderId = order.orderId;

    placeOrder.leaderKeyId = leaderKeyInfo[0].id;
    placeOrder.exchangeOrderId = response !== null ? response?.info?.orderId : null;
    placeOrder.userKeyId = userApiKey.id;

    return placeOrder;
  }
}
