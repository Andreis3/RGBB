import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { ExchangeError, ExchangeNotAvailable, RequestTimeout } from 'ccxt';
import { QUEUE_SCHEDULED_JOB_UPDATE_POSITION } from 'config/secret';
import { EXCHANGE_KEYS_CHUNK_SIZE, NUMBER_OF_FETCH_POSITION_RETRY } from 'constant';
import { UserExchangesKeys } from 'entities';
import UserPosition, { UserPositionRepository } from 'entities/UserPosition';
import { ExchangeHelper } from 'helpers/ExchangeHelper';
import { Connection, In, LessThan, MoreThan } from 'typeorm';
import { UserExchangeKeysService } from './UserExchangeKeysService';

@Injectable()
export class UserPositionsService {
  constructor(
    @Inject(UserExchangeKeysService)
    private readonly userExchangeKeysService: UserExchangeKeysService,
    @Inject(ExchangeHelper)
    private readonly exchangeHelper: ExchangeHelper,
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserPositionRepository)
    private readonly userPositionRepository: UserPositionRepository,
    @InjectQueue(QUEUE_SCHEDULED_JOB_UPDATE_POSITION)
    private readonly scheduledUpdatePositionQueue: Queue,
  ) {}

  async findPosition({
    status,
    type,
    position_side,
    exchange,
    symbol,
    exchange_key_id,
  }: {
    type: string;
    symbol: string;
    status: string;
    exchange: string;
    position_side: string;
    exchange_key_id: string;
  }): Promise<UserPosition> {
    return this.userPositionRepository.findOne({
      where: {
        status,
        type,
        position_side,
        exchange,
        symbol,
        exchange_key_id,
      },
    });
  }

  async updateUserPositions() {
    try {
      const numberOfExchangeKeys = await this.userExchangeKeysService.countRecords();

      const chunkSize = EXCHANGE_KEYS_CHUNK_SIZE;

      for (let page = 0; page < Math.ceil(numberOfExchangeKeys / chunkSize); page++) {
        this.addUpdatePositionJobs(page, chunkSize);
      }
      return true;
    } catch (error) {
      console.log(new Date(), 'error while update user positions: ', error?.message);
      return false;
    }
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchAllOpenPositionsOfExchangeKeys(exchangeKeys: UserExchangesKeys[]) {
    const fetchPositionsPromises = exchangeKeys.map((exchangeKey: UserExchangesKeys) => {
      return this.exchangeHelper.fetchPositions(exchangeKey.exchange, exchangeKey.key, exchangeKey.secretKey);
    });

    return Promise.all(fetchPositionsPromises);
  }

  constructUserPositionsList(userPositionsOfExchangeKeys: any, exchangeKeys: UserExchangesKeys[]) {
    const positionList: UserPosition[] = [];
    for (let idx = 0; idx < userPositionsOfExchangeKeys.length; idx++) {
      const exchangeKey = exchangeKeys[idx];
      const positions = userPositionsOfExchangeKeys[idx];

      if (!positions || !positions.length) continue;

      for (const position of positions) {
        const userPosition = new UserPosition();
        Object.assign(userPosition, {
          ...position,
          exchange_key_id: exchangeKey.id,
          time: new Date().toISOString(),
          user_id: exchangeKey.userId,
        });

        positionList.push(userPosition);
      }
    }

    return positionList;
  }

  async updateUserPositionsProcessor(page: number, chunkSize: number) {
    let retry = NUMBER_OF_FETCH_POSITION_RETRY;

    const exchangeKeys: UserExchangesKeys[] = await this.userExchangeKeysService.getUserExchangeKeysRecords(
      page,
      chunkSize,
    );

    if (!exchangeKeys.length) return;

    while (retry > 0) {
      try {
        const userPositionsOfExchangeKeys = await this.fetchAllOpenPositionsOfExchangeKeys(exchangeKeys);

        const positionList = this.constructUserPositionsList(userPositionsOfExchangeKeys, exchangeKeys);

        const exchangeKeyIds = exchangeKeys.map((exchangeKey) => exchangeKey.id);

        this.updateDbPositions(positionList, exchangeKeyIds);

        break;
      } catch (e) {
        console.log('error while getUserPositions ', e);

        if (e instanceof RequestTimeout || e instanceof ExchangeNotAvailable || e instanceof ExchangeError) {
          retry--;
          await this.delay(1000);
          continue;
        }

        break;
      }
    }
  }

  async mergeWithOldPosition(newPositions: UserPosition[]) {
    const mergedPosition = await Promise.all(
      newPositions.map(async (newPosition) => {
        const oldPosition = await this.findPosition({
          status: 'open',
          type: newPosition.type,
          symbol: newPosition.symbol,
          exchange: newPosition.exchange,
          position_side: newPosition.position_side,
          exchange_key_id: newPosition.exchange_key_id,
        });

        if (oldPosition) {
          /**
           * ?? Which fields to be merged ?
           */

          newPosition.time = oldPosition.time;
          newPosition.created_at = oldPosition.created_at;
          newPosition.realized_profit = oldPosition.realized_profit;
        }

        return newPosition;
      }),
    );

    return mergedPosition;
  }

  async updateDbPositions(positions: UserPosition[], exchangeKeyIds: string[]) {
    const mergedPositions = await this.mergeWithOldPosition(positions);

    await this.connection.transaction(async (manager) => {
      await this.deleteDbOpenPositionsOfKey(exchangeKeyIds);
      await manager.save(mergedPositions);
    });
  }

  async deleteDbOpenPositionsOfKey(exchangeKeyIds: string[]) {
    await this.userPositionRepository.delete({
      exchange_key_id: In(exchangeKeyIds),
      status: 'open',
    });
  }

  async countUserWinningPositions(userId: string, date = null) {
    const conditions: any = {
      user_id: userId,
      status: 'closed',
      realized_profit: MoreThan(0),
    };

    if (date) {
      conditions.updated_at = MoreThan(date);
    }

    return this.userPositionRepository.count({
      where: conditions,
    });
  }

  async countUserLosingPositions(userId: string, date = null) {
    const conditions: any = {
      user_id: userId,
      status: 'closed',
      realized_profit: LessThan(0),
    };

    if (date) {
      conditions.updated_at = MoreThan(date);
    }

    return this.userPositionRepository.count({
      where: conditions,
    });
  }

  async addUpdatePositionJobs(page: number, chunkSize: number) {
    const exchangeKeys: UserExchangesKeys[] = await this.userExchangeKeysService.getUserExchangeKeysRecords(
      page,
      chunkSize,
    );
    if (!exchangeKeys.length) return;

    exchangeKeys?.forEach((exchangeKey) => {
      this.addSingleExchangeKeyToScheduledUpdatePositionQueue(exchangeKey);
    });
  }

  async addNewExchangeKeyPositions(exchangeKey: any) {
    const fetchPositionResponse = await this.exchangeHelper.fetchPositions(
      exchangeKey.exchange,
      exchangeKey.key,
      exchangeKey.secret_key,
    );

    if (!fetchPositionResponse) return;

    const positionList: UserPosition[] = [];

    for (const position of fetchPositionResponse) {
      const userPosition = new UserPosition();
      Object.assign(userPosition, {
        ...position,
        exchange_key_id: exchangeKey.id,
        time: new Date().toISOString(),
        user_id: exchangeKey.user_id,
      });

      positionList.push(userPosition);
    }

    await this.userPositionRepository.save(positionList);
  }

  addSingleExchangeKeyToScheduledUpdatePositionQueue(exchangeKey: any) {
    this.scheduledUpdatePositionQueue.add(exchangeKey);
  }

  async findByExchangeKeyIdAndStatus(exchangeKeyId: string, status: string): Promise<UserPosition[]> {
    return this.userPositionRepository.find({
      where: {
        exchange_key_id: exchangeKeyId,
        status,
      },
    });
  }
}
