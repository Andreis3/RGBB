import { Inject, Injectable } from '@nestjs/common';
import { Connection, getConnection, getManager, MoreThan } from 'typeorm';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { CryptoPriceService } from './CryptoPriceService';
import { UserService } from './UserService';
import { UserExchangeKeysService } from './UserExchangeKeysService';
import { UserBalanceHistory, UserBalanceHistoryRepository } from 'entities/UserBalanceHistory';
import { UserBalanceHistoryDetail } from 'entities/UserBalanceHistoryDetail';
import { RedisCacheHelper } from '../helpers/RedisCacheHelper';
import { ExchangeHelper } from '../helpers/ExchangeHelper';
import * as moment from 'moment';
import { BALANCE_DETAIL_TYPE, EXCHANGES } from 'constant';
import { UserExchangesKeys } from 'entities';
import { CURRENCIES, QUEUE_UPDATE_BALANCE } from 'config/secret';
import { UserJoinedCupService } from './UserJoinedCupService';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class UserBalanceService {
  private cryptoPriceService: CryptoPriceService;
  private userService: UserService;
  private userExchangeKeysService: UserExchangeKeysService;
  private connection: Connection;
  private cacheHelper: RedisCacheHelper;
  private exchangeHelper: ExchangeHelper;

  constructor(
    @Inject(CryptoPriceService) cryptoPriceService: CryptoPriceService,
    @Inject(UserService) userService: UserService,
    @Inject(UserExchangeKeysService)
    userExchangeKeysService: UserExchangeKeysService,
    @InjectConnection() connection: Connection,
    @Inject(RedisCacheHelper) cacheHelper: RedisCacheHelper,
    @Inject(ExchangeHelper) exchangeHelper: ExchangeHelper,
    @InjectRepository(UserBalanceHistoryRepository)
    private readonly userBalanceHistoryRepository: UserBalanceHistoryRepository,
    @Inject(UserJoinedCupService)
    private readonly userJoinedCupService: UserJoinedCupService,
    @InjectQueue(QUEUE_UPDATE_BALANCE) private readonly balanceQueue: Queue,
  ) {
    this.cryptoPriceService = cryptoPriceService;
    this.userService = userService;
    this.userExchangeKeysService = userExchangeKeysService;
    this.connection = connection;
    this.cacheHelper = cacheHelper;
    this.exchangeHelper = exchangeHelper;
  }

  async checkBalanceHistory(exchange_key_id) {
    return await this.userBalanceHistoryRepository.findOne({
      where: {
        date: moment().format('YYYY-MM-DD'),
        exchange_key_id,
      },
    });
  }

  async updateBalanceHistoryOneExchangeKey(exchange_key_id: string) {
    try {
      const balance_histories: UserBalanceHistory[] = [];
      const balance_details: UserBalanceHistoryDetail[] = [];

      const support_currencies = CURRENCIES.split(',');
      const crypto_prices = await this.getCryptoPrices();

      const now = new Date();

      const record_detail_exchange_key = await this.userExchangeKeysService.findById(exchange_key_id);

      if (record_detail_exchange_key.exchange === EXCHANGES.TOKOCRYPTO) {
        // TODO: There's something went wrong with tokocrypto so we'll omit it, but need to update later!
        return 'TOKOCRYPTO_CURRENTLY_NOT_SUPPORTED';
      }

      const histories = await this.generateBalanceHistories(
        record_detail_exchange_key,
        crypto_prices,
        support_currencies,
        now,
      );
      if (histories?.summary?.length) {
        balance_histories.push(...histories.summary);
      }
      if (histories?.detail?.length) {
        balance_details.push(...histories.detail);
      }

      await this.insertAndDeleteBalanceHistoriesByExChangeKeyId(balance_histories, balance_details, exchange_key_id);
    } catch (e) {
      console.error('Update user balance error:', e);
    }
  }

  async updateBalanceHistories() {
    try {
      const numberOfExchangeKeys = await this.userExchangeKeysService.countRecords();
      const chunkSize = 100;
      for (let page = 0; page < numberOfExchangeKeys / chunkSize; page++) {
        this.addExchangeKeyToUpdateBalanceQueue(page, chunkSize);
      }
      return true;
    } catch (err) {
      console.log('Update user balance error: ', err);
      return false;
    }
  }

  async generateBalanceHistories(exchangeConfig, cryptoPrices, supportCurrencies, now) {
    const balanceHistories = [];
    const userBalance = await this.exchangeHelper.fetchBalance(
      exchangeConfig.exchange,
      exchangeConfig.key,
      exchangeConfig.secretKey,
    );

    const userIncome = await this.exchangeHelper.getUserIncome(
      exchangeConfig.exchange,
      exchangeConfig.key,
      exchangeConfig.secretKey,
    );

    const balanceDetails = this.generateBalanceDetail(userBalance, userIncome, exchangeConfig, now);
    for (const index in supportCurrencies) {
      const currency = supportCurrencies[index];
      const key = currency;
      const cryptoPrice = cryptoPrices[key];
      const balanceByCurrency = this.calculateUserBalanceAmount(userBalance, currency, cryptoPrice);
      const incomeByCurrency = this.calculateIncome(userIncome, currency, cryptoPrice);

      const { dailyProfit, dailyProfitRate } = await this.calculateDailyProfit(
        balanceByCurrency,
        incomeByCurrency,
        exchangeConfig.id,
        currency,
      );

      const balanceHistory = new UserBalanceHistory();
      balanceHistory.time = now.toISOString();
      balanceHistory.user_id = exchangeConfig.userId;
      balanceHistory.exchange_name = exchangeConfig.exchange;
      balanceHistory.currency_unit = supportCurrencies[index];
      balanceHistory.date = now;
      balanceHistory.total_value = balanceByCurrency;
      balanceHistory.deposit_amount = incomeByCurrency.deposit;
      balanceHistory.withdraw_amount = incomeByCurrency.withdraw;
      balanceHistory.exchange_key_id = exchangeConfig.id;
      balanceHistory.profit = dailyProfit;
      balanceHistory.profit_rate = dailyProfitRate;
      balanceHistories.push(balanceHistory);
    }
    return {
      summary: balanceHistories,
      detail: balanceDetails,
    };
  }

  generateBalanceDetail(userBalance, userIncome, exchangeConfig, now: Date) {
    const result = [];
    if (userBalance !== undefined && userBalance.length > 0) {
      const userBalanceHasValue = userBalance.filter((element) => {
        return element.balanceAmount > 0;
      });
      for (const item of userBalanceHasValue) {
        const balanceDetail = this.createBalanceDetailEntity({
          time: now.toISOString(),
          crypto_symbol: item.symbol,
          date: now,
          amount: item.balanceAmount,
          exchange_name: exchangeConfig.exchange,
          exchange_key_id: exchangeConfig.id,
          user_id: exchangeConfig.userId,
          type: BALANCE_DETAIL_TYPE.BALANCE,
        });
        result.push(balanceDetail);
      }
    }
    if (userIncome !== undefined) {
      for (const cryptoSymbol in userIncome) {
        const tempDetailData = {
          time: now.toISOString(),
          crypto_symbol: cryptoSymbol,
          date: now,
          exchange_name: exchangeConfig.exchange,
          exchange_key_id: exchangeConfig.id,
          user_id: exchangeConfig.userId,
        };
        const item = userIncome[cryptoSymbol];
        if (item.depositAmount > 0) {
          tempDetailData['amount'] = item.depositAmount;
          tempDetailData['type'] = BALANCE_DETAIL_TYPE.DEPOSIT;
          result.push(this.createBalanceDetailEntity(tempDetailData));
        }
        if (item.withdrawAmount > 0) {
          tempDetailData['amount'] = item.withdrawAmount;
          tempDetailData['type'] = BALANCE_DETAIL_TYPE.WITHDRAW;
          result.push(this.createBalanceDetailEntity(tempDetailData));
        }
      }
    }
    return result;
  }

  createBalanceDetailEntity(balanceDetail) {
    const userBalanceHistoryDetailRepo = this.connection.getRepository(UserBalanceHistoryDetail);
    return userBalanceHistoryDetailRepo.create(balanceDetail);
  }

  calculateUserBalanceAmount(userBalance, currency, cryptoPrice) {
    let balanceByCurrency = 0;
    if (userBalance === undefined) {
      return balanceByCurrency;
    }
    const userBalanceHasValue = userBalance.filter((element) => {
      return element.balanceAmount > 0;
    });
    userBalanceHasValue.forEach((element) => {
      const pricePerCurrency = this.calculatePricePerCurrency(element.symbol, currency, cryptoPrice);
      balanceByCurrency += parseFloat(pricePerCurrency) * parseFloat(element.balanceAmount);
    });
    return balanceByCurrency;
  }

  calculateIncome(userIncome, currency, cryptoPrice) {
    if (userIncome == undefined) {
      return { deposit: 0, withdraw: 0 };
    }
    const result = { deposit: 0, withdraw: 0 };
    for (const cryptoSymbol in userIncome) {
      const pricePerCurrency = this.calculatePricePerCurrency(cryptoSymbol, currency, cryptoPrice);
      result.deposit += userIncome[cryptoSymbol].depositAmount * pricePerCurrency;
      result.withdraw += userIncome[cryptoSymbol].withdrawAmount * pricePerCurrency;
    }
    return result;
  }

  async getCryptoPrices() {
    const result = {};
    const allCryptoPrice = await this.cryptoPriceService.findAll();
    for (const cryptoPrice of allCryptoPrice) {
      if (result[cryptoPrice.currency] !== undefined) {
        result[cryptoPrice.currency][cryptoPrice.symbol] = cryptoPrice.price;
      } else {
        result[cryptoPrice.currency] = {
          [cryptoPrice.symbol]: cryptoPrice.price,
        };
      }
    }
    return result;
  }

  calculatePricePerCurrency(cryptoSymbol: string, currency: string, cryptoPrice: object) {
    if (cryptoSymbol.toLowerCase() === currency.toLowerCase()) {
      return 1;
    }
    if (cryptoPrice !== undefined && cryptoPrice[cryptoSymbol.toLowerCase()] !== undefined) {
      return cryptoPrice[cryptoSymbol.toLowerCase()];
    }
    return 0;
  }

  async insertAndDeleteBalanceHistoriesByExChangeKeyId(
    histories: UserBalanceHistory[],
    balanceDetails: UserBalanceHistoryDetail[],
    exchange_key_id: string,
  ) {
    const today = moment().format('YYYY-MM-DD');
    await this.connection.transaction(async (manager) => {
      await this.deleteOldBalanceHistoryByDateAndExchangeKeyId(today, exchange_key_id);
      await manager.save(histories);
      await manager.save(balanceDetails);
    });
  }

  async insertAndDeleledBalanceHistories(histories: UserBalanceHistory[], balanceDetails: UserBalanceHistoryDetail[]) {
    const today = moment().format('YYYY-MM-DD');
    await this.connection.transaction(async (manager) => {
      await this.deleteOldBalanceHistoryByDate(today);
      await manager.save(histories);
      await manager.save(balanceDetails);
      await this.updateUsersJoinedCupsProfitValueAndProfitRate(histories);
    });
  }

  async deleteOldBalanceHistoryByDate(date) {
    await getConnection()
      .createQueryBuilder()
      .delete()
      .from(UserBalanceHistory)
      .where('date = :date', { date: date })
      .execute();
    await getConnection()
      .createQueryBuilder()
      .delete()
      .from(UserBalanceHistoryDetail)
      .where('date = :date', { date: date })
      .execute();
  }

  async deleteOldBalanceHistoryByDateAndExchangeKeyId(date, exchange_key_id) {
    await getConnection()
      .createQueryBuilder()
      .delete()
      .from(UserBalanceHistory)
      .where('date = :date', { date: date })
      .andWhere('exchange_key_id = :exchange_key_id', { exchange_key_id: exchange_key_id })
      .execute();
    await getConnection()
      .createQueryBuilder()
      .delete()
      .from(UserBalanceHistoryDetail)
      .where('date = :date', { date: date })
      .andWhere('exchange_key_id = :exchange_key_id', { exchange_key_id: exchange_key_id })
      .execute();
  }

  async updateBalanceHistoryByExchangeKey(exchangeKey: UserExchangesKeys) {
    const supportCurrencies = CURRENCIES.split(',');
    const cryptoPrices = await this.getCryptoPrices();
    const now = new Date();
    const histories = await this.generateBalanceHistories(exchangeKey, cryptoPrices, supportCurrencies, now);
    await this.updateBalanceHistoriesOfOneExchangeKey(histories, exchangeKey);
  }

  async updateBalanceHistoriesOfOneExchangeKey(histories, exchangeKey) {
    const today = moment().format('YYYY-MM-DD');
    await this.connection.transaction(async (manager) => {
      await this.deleteOldDataOfOneExchangeKey(today, exchangeKey.id);
      await manager.save(histories.summary);
      await manager.save(histories.detail);
    });
  }

  async deleteOldDataOfOneExchangeKey(date, exchangeKeyId) {
    await getConnection()
      .createQueryBuilder()
      .delete()
      .from(UserBalanceHistory)
      .where('date = :date', { date: date })
      .where('exchange_key_id = :exchangeKeyId', {
        exchangeKeyId: exchangeKeyId,
      })
      .execute();
    await getConnection()
      .createQueryBuilder()
      .delete()
      .from(UserBalanceHistoryDetail)
      .where('date = :date', { date: date })
      .where('exchange_key_id = :exchangeKeyId', {
        exchangeKeyId: exchangeKeyId,
      })
      .execute();
  }

  async getOldBalanceHistory(date: string, exchangeKeyId: string, currency: string) {
    return this.userBalanceHistoryRepository.findOne({
      where: {
        date: date,
        exchange_key_id: exchangeKeyId,
        currency_unit: currency,
      },
    });
  }

  async calculateDailyProfit(
    todayBalance: number,
    todayIncome: any,
    keyId: string,
    currency: string,
  ): Promise<{
    dailyProfit: number;
    dailyProfitRate: number;
  }> {
    try {
      /**
       * Daily profit = today balance - yesterday balance + today deposit - today withdraw
       */
      const yesterday = moment().subtract(1, 'days');
      const yesterdayDate = moment(yesterday).format('YYYY-MM-DD');

      const yesterdayBalanceHistory = await this.getOldBalanceHistory(yesterdayDate, keyId, currency);

      if (!yesterdayBalanceHistory) return { dailyProfit: 0, dailyProfitRate: 0 };

      const yesterdayBalance = Number(yesterdayBalanceHistory?.total_value || 0);
      const todayDeposit = todayIncome?.deposit || 0;
      const todayWithdraw = todayIncome?.withdraw || 0;

      let profit = parseFloat(todayBalance - yesterdayBalance - todayDeposit + todayWithdraw);

      // ? Do we need to deal with this, since the profit can be very small
      if (Math.abs(profit) < 1e-9) profit = 0;

      const profitRate = yesterdayBalance === 0 ? 0 : (profit / yesterdayBalance) * 100;

      return {
        dailyProfit: profit,
        dailyProfitRate: profitRate,
      };
    } catch (err) {
      console.log(new Date(), 'error with calculate daily profit ', err.message);
      return {
        dailyProfit: 0,
        dailyProfitRate: 0,
      };
    }
  }

  async updateUsersJoinedCupsProfitValueAndProfitRate(histories: UserBalanceHistory[]) {
    try {
      const updateUserJoinedCupPromises = histories.map((history) => {
        const { exchange_key_id, user_id, profit } = history;
        return this.userJoinedCupService.updatedUserJoinedCupProfitValueAndProfitRate(exchange_key_id, user_id, profit);
      });

      await Promise.all(updateUserJoinedCupPromises);
    } catch (error) {
      console.log(new Date(), 'error with updateUsersJoinedCupsProfitValueAndProfitRate ', error.message);
      return [];
    }
  }

  async getUserTodayProfit(userId: string) {
    const todayProfitValue = await this.userBalanceHistoryRepository
      .createQueryBuilder()
      .select('SUM(profit)', 'profitValue')
      .where('user_id = :userId', { userId: userId })
      .andWhere('date = :date', { date: moment().format('YYYY-MM-DD') })
      .getRawOne();

    return todayProfitValue?.profitValue || 0;
  }

  async getUserLast7DaysProfit(userId: string) {
    const last30DaysProfitValue = await this.userBalanceHistoryRepository
      .createQueryBuilder()
      .select('SUM(profit)', 'profitValue')
      .where('user_id = :userId', { userId: userId })
      .andWhere('date >= :date', { date: moment().subtract(6, 'days').format('YYYY-MM-DD') })
      .getRawOne();

    return last30DaysProfitValue?.profitValue || 0;
  }

  async getUserLast30DaysProfit(userId: string) {
    const last30DaysProfitValue = await this.userBalanceHistoryRepository
      .createQueryBuilder()
      .select('SUM(profit)', 'profitValue')
      .where('user_id = :userId', { userId: userId })
      .andWhere('date >= :date', { date: moment().subtract(29, 'days').format('YYYY-MM-DD') })
      .getRawOne();

    return last30DaysProfitValue?.profitValue || 0;
  }

  async getUserAllTimeProfit(userId: string) {
    const allTimeProfitValue = await this.userBalanceHistoryRepository
      .createQueryBuilder()
      .select('SUM(profit)', 'profitValue')
      .where('user_id = :userId', { userId: userId })
      .getRawOne();

    return allTimeProfitValue?.profitValue || 0;
  }

  async getUserYesterdayTotalBalance(userId: string) {
    const userYesterdayBalance = await this.userBalanceHistoryRepository
      .createQueryBuilder()
      .select('SUM(total_value)', 'totalBalance')
      .where('user_id = :userId', { userId: userId })
      .andWhere('date = :date', { date: moment().subtract(1, 'days').format('YYYY-MM-DD') })
      .getRawOne();

    return userYesterdayBalance?.totalBalance || 0;
  }

  sumTotalValues(records: any) {
    if (!records || !records.length) return 0;

    return (
      records?.reduce((ans: number, cur: any) => ans + (cur?.total_value ? parseFloat(cur.total_value) : 0), 0) || 0
    );
  }

  async getUserFirstTotalBalanceOnLast7Days(userId: string) {
    const entityManager = getManager();

    const firstBalanceOfEachExchangeKeyOnLast7Days = await entityManager.query(
      `select exchange_key_id,
              (select total_value from user_balance_histories where exchange_key_id = ubh.exchange_key_id and date >= $2 order by date asc limit 1)
         as total_value from user_balance_histories as ubh
       where user_id = $1 group by exchange_key_id`,
      [userId, moment().subtract(7, 'days').format('YYYY-MM-DD')],
    );

    return this.sumTotalValues(firstBalanceOfEachExchangeKeyOnLast7Days);
  }

  async getUserFirstTotalBalanceOnLast30Days(userId: string) {
    const entityManager = getManager();

    const firstBalanceOfEachExchangeKeyOnLast30Days = await entityManager.query(
      `select exchange_key_id,
              (select total_value from user_balance_histories where exchange_key_id = ubh.exchange_key_id and date >= $2 order by date asc limit 1)
         as total_value from user_balance_histories as ubh
       where user_id = $1 group by exchange_key_id`,
      [userId, moment().subtract(30, 'days').format('YYYY-MM-DD')],
    );

    return this.sumTotalValues(firstBalanceOfEachExchangeKeyOnLast30Days);
  }

  async getUserFirstTotalBalance(userId: string) {
    const entityManager = getManager();
    const firstBalanceOfEachExchangeKey = await entityManager.query(
      `select exchange_key_id,
              (select total_value from user_balance_histories where exchange_key_id = ubh.exchange_key_id order by date asc limit 1)
         as total_value from user_balance_histories as ubh
       where user_id = $1 group by exchange_key_id`,
      [userId],
    );

    return this.sumTotalValues(firstBalanceOfEachExchangeKey);
  }

  async addExchangeKeyToUpdateBalanceQueue(page: number, chunkSize: number) {
    const exchangeKeys = await this.userExchangeKeysService.getUserExchangeKeysRecords(page, chunkSize);

    const checkShouldUpdateBalancePromises = exchangeKeys.map(async (exchangeKey: Partial<UserExchangesKeys>) => {
      const { id, userId } = exchangeKey;

      const isBalanceRecentlyUpdated = await this.userBalanceHistoryRepository.findOne({
        where: {
          date: moment().format('YYYY-MM-DD'),
          exchange_key_id: id,
          updated_at: MoreThan(moment().subtract(1, 'minutes')),
        },
      });

      if (!isBalanceRecentlyUpdated) {
        this.balanceQueue.add({
          exchange_key_id: id,
          userId,
        });
      }
    });

    await Promise.all(checkShouldUpdateBalancePromises);
  }
}
