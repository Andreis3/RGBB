import * as moment from 'moment';
import { Connection, In } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { ExchangeError, ExchangeNotAvailable, RequestTimeout } from 'ccxt';

import { UserService } from './UserService';
import { UserBalanceService } from './UserBalanceService';
import { UserPositionsService } from './UserPositionsService';
import { UserExchangeKeysService } from './UserExchangeKeysService';

import { UserTotalProfit, UserTotalProfitRepository } from 'entities/UserTotalProfit';

import { NUMBER_OF_UPDATE_USER_TOTAL_PROFIT_RETRY, USER_CHUNK_SIZE } from 'constant';

@Injectable()
export class UserTotalProfitService {
  @Inject()
  private readonly userBalanceService: UserBalanceService;

  @Inject()
  private readonly userService: UserService;

  @Inject()
  private readonly userPositionService: UserPositionsService;

  @Inject()
  private readonly userExchangeKeyService: UserExchangeKeysService;

  @InjectRepository(UserTotalProfitRepository)
  private readonly userTotalProfitRepository: UserTotalProfitRepository;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async updateUserTotalProfit() {
    const numberOfUsers = await this.userService.countUserRecords();
    const chunkSize = USER_CHUNK_SIZE;

    for (let page = 0; page < Math.ceil(numberOfUsers / chunkSize); page++) {
      this.updateUserTotalProfitProcessor(page, chunkSize);
    }
    return true;
  }

  async updateUserTotalProfitProcessor(page: number, chunkSize: number) {
    let retry = NUMBER_OF_UPDATE_USER_TOTAL_PROFIT_RETRY;

    const users = await this.userService.getUserRecords(page, chunkSize);

    if (!users.length) return;

    while (retry > 0) {
      try {
        const userTotalProfitPromises = users.map((user) => this.getUserTotalProfitData(user.id));
        const userTotalProfitResponses = await Promise.all(userTotalProfitPromises);

        const userTotalProfitList = userTotalProfitResponses.map((userTotalProfitResponse) => {
          const userTotalProfit = new UserTotalProfit();
          return Object.assign(userTotalProfit, {
            ...userTotalProfitResponse,
            time: new Date().toISOString(),
          });
        });

        await this.updateDbUserTotalProfit(userTotalProfitList);
        break;
      } catch (e) {
        console.log(new Date(), 'error updateUserTotalProfitProcessor: ', e);
        if (e instanceof RequestTimeout || e instanceof ExchangeNotAvailable || e instanceof ExchangeError) {
          retry--;
          await this.delay(1000);
          continue;
        }

        break;
      }
    }
  }

  async getUserProfitValues(userId: string) {
    const [todayProfitValue, last7DaysProfitValue, last30DaysProfitValue, allTimeProfitValue] = await Promise.all([
      this.userBalanceService.getUserTodayProfit(userId),
      this.userBalanceService.getUserLast7DaysProfit(userId),
      this.userBalanceService.getUserLast30DaysProfit(userId),
      this.userBalanceService.getUserAllTimeProfit(userId),
    ]);

    return {
      todayProfitValue,
      last7DaysProfitValue,
      last30DaysProfitValue,
      allTimeProfitValue,
    };
  }

  async getUserBalanceHistories(userId: string) {
    const [userYesterdayBalance, userLast7DaysBalance, userLast30DaysBalance, userFirstBalance] = await Promise.all([
      this.userBalanceService.getUserYesterdayTotalBalance(userId),
      this.userBalanceService.getUserFirstTotalBalanceOnLast7Days(userId),
      this.userBalanceService.getUserFirstTotalBalanceOnLast30Days(userId),
      this.userBalanceService.getUserFirstTotalBalance(userId),
    ]);

    return {
      userYesterdayBalance,
      userLast7DaysBalance,
      userLast30DaysBalance,
      userFirstBalance,
    };
  }

  async getUserProfitValuesAndRates(userId: string) {
    const [
      { todayProfitValue, last7DaysProfitValue, allTimeProfitValue, last30DaysProfitValue },
      { userYesterdayBalance, userLast30DaysBalance, userFirstBalance, userLast7DaysBalance },
    ] = await Promise.all([this.getUserProfitValues(userId), this.getUserBalanceHistories(userId)]);

    const todayProfitRate = userYesterdayBalance ? (todayProfitValue / userYesterdayBalance) * 100 : 0;
    const last7DaysProfitRate = userLast7DaysBalance ? (last7DaysProfitValue / userLast7DaysBalance) * 100 : 0;
    const last30DaysProfitRate = userLast30DaysBalance ? (last30DaysProfitValue / userLast30DaysBalance) * 100 : 0;
    const allTimeProfitRate = userFirstBalance ? (allTimeProfitValue / userFirstBalance) * 100 : 0;

    return {
      userId,
      profitValueDaily: todayProfitValue,
      profitValueAllTime: allTimeProfitValue,
      profitRateDaily: todayProfitRate,
      profitRateAllTime: allTimeProfitRate,
      profitValueMonthly: last30DaysProfitValue,
      profitRateMonthly: last30DaysProfitRate,
      profitRateWeekly: last7DaysProfitRate,
      profitValueWeekly: last7DaysProfitValue,
    };
  }

  calculateWinRate(winCount: number, loseCount: number) {
    if (!winCount) return 0;
    if (!loseCount) return 100;

    return (winCount / (winCount + loseCount)) * 100;
  }

  async getUserWinRateSinceDate(userId: string, date: Date) {
    const [winCount, loseCount] = await Promise.all([
      this.userPositionService.countUserWinningPositions(userId, date),
      this.userPositionService.countUserLosingPositions(userId, date),
    ]);

    return this.calculateWinRate(winCount, loseCount);
  }

  async getUserAllTimeWinRate(userId: string) {
    const [winCount, loseCount] = await Promise.all([
      this.userPositionService.countUserWinningPositions(userId),
      this.userPositionService.countUserLosingPositions(userId),
    ]);

    return this.calculateWinRate(winCount, loseCount);
  }

  async getUserWinRates(userId: string) {
    const winRateTimes = [
      moment().subtract(1, 'days').format('YYYY-MM-DD'),
      moment().subtract(7, 'days').format('YYYY-MM-DD'),
      moment().subtract(30, 'days').format('YYYY-MM-DD'),
    ];

    const [winrate1d, winrate7d, winrate30d] = await Promise.all(
      winRateTimes.map((date) => this.getUserWinRateSinceDate(userId, new Date(date))),
    );
    const winrateAllTime = await this.getUserAllTimeWinRate(userId);

    return {
      winrate1d,
      winrate7d,
      winrate30d,
      winrateAllTime,
    };
  }

  async getUserCopyableAndUnCopyableStatus(userId: string) {
    const [copyable, uncopyable] = await Promise.all([
      this.userExchangeKeyService.doesUserHasAtLeastOneCopyableKey(userId),
      this.userExchangeKeyService.doesUserHasAtLeastOneUnCopyableKey(userId),
    ]);

    return {
      copyable,
      uncopyable,
    };
  }

  async getUserExchanges(userId: string) {
    const exchanges = await this.userExchangeKeyService.getExchangeNamesWhichUserHasKeys(userId);

    if (!exchanges || !exchanges.length) return '';

    return `|${exchanges.join('|')}|`;
  }

  async getUserTotalProfitData(userId: string) {
    const [winRatesResponse, profitValuesAndProfitRatesResponse, copyableAndUncopyableStatus, exchanges] =
      await Promise.all([
        this.getUserWinRates(userId),
        this.getUserProfitValuesAndRates(userId),
        this.getUserCopyableAndUnCopyableStatus(userId),
        this.getUserExchanges(userId),
      ]);

    return {
      ...winRatesResponse,
      ...copyableAndUncopyableStatus,
      ...profitValuesAndProfitRatesResponse,
      exchanges,
    };
  }

  async updateDbUserTotalProfit(userTotalProfitList: UserTotalProfit[]) {
    await this.connection.transaction(async (manager) => {
      try {
        const userIds = userTotalProfitList.map((userTotalProfit) => userTotalProfit.userId);
        await this.deleteDbUserTotalProfit(userIds);
        await manager.save(userTotalProfitList);
      } catch (error) {
        console.log(`error`, error);
      }
    });
  }

  async deleteDbUserTotalProfit(userIds: string[]) {
    await this.userTotalProfitRepository.delete({
      userId: In(userIds),
    });
  }
}
