import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, In } from 'typeorm';
import ccxt, { ExchangeError, ExchangeNotAvailable, RequestTimeout } from 'ccxt';

import { ExchangeHelper } from 'helpers/ExchangeHelper';
import { UserExchangeKeysService } from './UserExchangeKeysService';

import { UserExchangesKeys } from 'entities';
import { UserOpenOrder, UserOpenOrderRepository } from 'entities/UserOpenOrder';

import { EXCHANGE_KEYS_CHUNK_SIZE, NUMBER_OF_FETCH_OPEN_ORDER_RETRY } from 'constant';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_SCHEDULED_JOB_UPDATE_OPEN_ORDER } from 'config/secret';
import { Queue } from 'bull';

@Injectable()
export class UserOpenOrderService {
  constructor(
    @Inject(UserExchangeKeysService)
    private readonly userExchangeKeysService: UserExchangeKeysService,
    @Inject(ExchangeHelper)
    private readonly exchangeHelper: ExchangeHelper,
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserOpenOrderRepository)
    private readonly userOpenOrderRepository: UserOpenOrderRepository,
    @InjectQueue(QUEUE_SCHEDULED_JOB_UPDATE_OPEN_ORDER)
    private readonly scheduledUpdateOpenOrderQueue: Queue,
  ) {}

  async updateUsersOpenOrders() {
    try {
      const numberOfExchangeKeys = await this.userExchangeKeysService.countRecords();

      const chunkSize = EXCHANGE_KEYS_CHUNK_SIZE;

      for (let page = 0; page < Math.ceil(numberOfExchangeKeys / chunkSize); page++) {
        this.addUpdateOpenOrderJobs(page, chunkSize);
      }
      return true;
    } catch (error) {
      console.log(new Date(), 'error while update user user open orders: ', error.message);
      return false;
    }
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  triggerByTranslator(triggerBy: string): string {
    switch (triggerBy) {
      case 'CONTRACT_PRICE':
      case 'LastPrice':
        return 'Last Price';
      case 'MARK_PRICE':
      case 'MarkPrice':
        return 'Market Price';
      case 'IndexPrice':
        return 'Index Price';
      default:
        return triggerBy;
    }
  }

  openOrderTranslator(order: ccxt.Order, exchangeKey: UserExchangesKeys): UserOpenOrder {
    const { info } = order;

    const translatedOrder = {
      exchange: exchangeKey.exchange,
      amount: order.amount,
      filled: order?.filled || 0,
      remaining: order.remaining || order.amount - (order?.filled || 0),
      type: order.type,
      reduceOnly: info?.reduceOnly || false,
      postOnly: (order as any).postOnly || false,
      symbol: order.symbol,
      datetime: order.datetime || info.created_time || info.createdAt || new Date().toISOString(),
      price: order.price || 0, // with stop market and trailing_stop_market, price will be 0
      side: order.side,
      status: order.status,
      stopPrice: (order as any)?.stopPrice || info?.trigger_price || info?.stopPrice || 0, // with take profit limt/market, stopPrice will be triggerPrice
      activationPrice: info?.activatePrice || 0,
      callbackRate: info?.priceRate || 0,
      trailValue: info?.trailValue || 0, // trailing stop order only
      marketPrice: Number(info?.base_price || 0),
      triggerBy: this.triggerByTranslator(info?.trigger_by || info?.workingType || ''),
      metaData: {
        ...info,
      },
      exchangeKeyId: exchangeKey.id,
      time: new Date().toISOString(),
      userId: exchangeKey.userId,
      orderId: order.id,
    };
    const userOpenOrder = new UserOpenOrder();
    Object.assign(userOpenOrder, translatedOrder);

    return userOpenOrder;
  }

  async getAndUpdateUserOpenOrders(page: number, chunkSize: number) {
    let retry = NUMBER_OF_FETCH_OPEN_ORDER_RETRY;

    const exchangeKeys: UserExchangesKeys[] = await this.userExchangeKeysService.getUserExchangeKeysRecords(
      page,
      chunkSize,
    );

    if (!exchangeKeys.length) return;

    while (retry > 0) {
      try {
        const openOrderList: UserOpenOrder[] = [];

        const fetchOpenOrdersPromises = exchangeKeys.map((exchangeKey: UserExchangesKeys) => {
          return this.exchangeHelper.fetchOpenOrders(exchangeKey.exchange, exchangeKey.key, exchangeKey.secretKey);
        });

        const fetchOpenOrdersResponses = await Promise.all(fetchOpenOrdersPromises);

        for (let idx = 0; idx < fetchOpenOrdersResponses.length; idx++) {
          const exchangeKey = exchangeKeys[idx];
          const openOrders = fetchOpenOrdersResponses[idx];

          if (!openOrders || !openOrders.length) continue;

          for (const openOrder of openOrders) {
            const userOpenOrder = this.openOrderTranslator(openOrder, exchangeKey);

            openOrderList.push(userOpenOrder);
          }
        }

        const exchangeKeyIds = exchangeKeys.map((exchangeKey: UserExchangesKeys) => exchangeKey.id);

        this.updateDbOpenOrders(openOrderList, exchangeKeyIds);

        break;
      } catch (e) {
        console.log('error while getAndUpdateUserOpenOrders ', e);

        if (e instanceof RequestTimeout || e instanceof ExchangeNotAvailable || e instanceof ExchangeError) {
          retry--;
          await this.delay(1000);
          continue;
        }

        break;
      }
    }
  }

  async addNewExchangeKeyOpenOrders(exchangeKey: any) {
    const openOrderList: UserOpenOrder[] = [];

    const fetchOpenOrderResponse = await this.exchangeHelper.fetchOpenOrders(
      exchangeKey.exchange,
      exchangeKey.key,
      exchangeKey.secret_key,
    );

    if (!fetchOpenOrderResponse)
      throw new Error(`error while fetch open orders with new exchange key ${exchangeKey.exchange}`);

    fetchOpenOrderResponse?.forEach((rawOrder: any) => {
      const userOpenOrder = this.openOrderTranslator(rawOrder, exchangeKey);
      userOpenOrder.userId = exchangeKey.user_id;
      openOrderList.push(userOpenOrder);
    });

    await this.userOpenOrderRepository.save(openOrderList);
  }

  async updateDbOpenOrders(userOpenOrders: UserOpenOrder[], exchangeKeyIds: string[]) {
    await this.connection.transaction(async (manager) => {
      await this.deleteDbOpenOrdersOfKey(exchangeKeyIds);
      await manager.save(userOpenOrders);
    });
  }

  async deleteDbOpenOrdersOfKey(exchangeKeyIds: string[]) {
    await this.userOpenOrderRepository.delete({
      exchangeKeyId: In(exchangeKeyIds),
    });
  }

  async addUpdateOpenOrderJobs(page: number, chunkSize: number) {
    const exchangeKeys: UserExchangesKeys[] = await this.userExchangeKeysService.getUserExchangeKeysRecords(
      page,
      chunkSize,
    );
    if (!exchangeKeys.length) return;
    exchangeKeys?.forEach((exchangeKey) => {
      this.addSingleExchangeKeyToScheduledUpdateOpenOrderQueue(exchangeKey);
    });
  }

  addSingleExchangeKeyToScheduledUpdateOpenOrderQueue(exchangeKey: any) {
    this.scheduledUpdateOpenOrderQueue.add(exchangeKey);
  }

  async findByExchangeKeyId(exchangeKeyId: string): Promise<UserOpenOrder[]> {
    return await this.userOpenOrderRepository.find({
      where: {
        exchangeKeyId,
      },
    });
  }
}
