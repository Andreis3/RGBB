import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cup, CupRepository } from 'entities/Cup';
import { UserBalanceHistoryRepository } from 'entities/UserBalanceHistory';
import { UserJoinedCup, UserJoinedCupRepository } from 'entities/UserJoinedCup';
import { TUserJoinedCupConditions } from 'resources/UserJoinedCup';
import * as moment from 'moment';
import { In } from 'typeorm';
import { UserJoinCupDTO } from 'src/user-joined-cup/payload/CheckUserCanJoinCupDTO';

@Injectable()
export class UserJoinedCupService {
  constructor(
    @InjectRepository(UserJoinedCupRepository)
    private userJoinedCupRepository: UserJoinedCupRepository,

    @InjectRepository(CupRepository)
    private cupRepository: CupRepository,

    @InjectRepository(UserBalanceHistoryRepository)
    private readonly userBalanceHistoryRepository: UserBalanceHistoryRepository,
  ) {}

  async findUserJoinedCup(conditions: TUserJoinedCupConditions): Promise<UserJoinedCup> {
    return this.userJoinedCupRepository.findOne({
      where: conditions,
    });
  }

  isDateWithinCupTime(cup: Cup, dateStr: string) {
    const { startTime, endTime } = cup;
    const now = moment(dateStr);
    const startTimeDate = moment(startTime);
    const endTimeDate = moment(endTime);
    return now.isBetween(startTimeDate, endTimeDate);
  }

  async updateFirstTimeUserJoinsCup(newUserJoinedCupData: any) {
    try {
      const { exchange_key_id, cup_id, user_id, join_time } = newUserJoinedCupData;

      console.log(`newUserJoinedCupData`, newUserJoinedCupData);

      const today = moment().format('YYYY-MM-DD');
      const cup = await this.cupRepository.findOne(cup_id);

      if (!cup) {
        throw new Error('Cup not found');
      }

      if (!this.isDateWithinCupTime(cup, join_time)) {
        throw new Error('Out of cup time');
      }

      const todayBalance = await this.userBalanceHistoryRepository.findOne({
        where: {
          date: today,
          exchange_key_id: exchange_key_id,
        },
      });

      if (!todayBalance) {
        throw new Error('Today balance not found!');
      }

      const userJoinedCupConditions = {
        cupId: cup_id,
        userId: user_id,
        exchangeKeyId: exchange_key_id,
        joinTime: join_time,
      };

      const userJoinedCup = await this.findUserJoinedCup(userJoinedCupConditions);

      if (userJoinedCup) {
        const updateValues = {
          initialBalance: todayBalance.total_value,
          profitRate: 0,
          profitValue: 0,
          totalBenefit: 0,
          benefitYesterday: 0,
          rank: 0,
        };

        await this.userJoinedCupRepository.update(userJoinedCupConditions, updateValues);
      }
    } catch (error) {
      console.log('error: ', error);
    }
  }

  async updatedUserJoinedCupProfitValueAndProfitRate(exchangeKeyId: string, userId: string, profit: number) {
    try {
      const userJoinedCupEntities = await this.userJoinedCupRepository.find({
        where: {
          userId,
          exchangeKeyId,
          deletedAt: null,
        },
      });

      if (!userJoinedCupEntities || !userJoinedCupEntities.length) {
        return [];
      }

      const cupIds = userJoinedCupEntities.map((userJoinedCupEntity) => userJoinedCupEntity.cupId);
      const cups = await this.cupRepository.find({
        where: {
          id: In(cupIds),
        },
      });

      const updateUserJoinedCupPromises = userJoinedCupEntities.map(async (userJoinedCupEntity) => {
        const { cupId } = userJoinedCupEntity;
        const cup = cups.find((cup) => cup.id === cupId);

        if (!cup || !this.isDateWithinCupTime(cup, new Date().toISOString())) {
          return;
        }

        const { profitValue = 0, initialBalance = 0 } = userJoinedCupEntity;
        const newProfitValue = Number(profitValue) + Number(profit);
        const newProfitRate = initialBalance === 0 ? 0 : (newProfitValue / initialBalance) * 100;
        userJoinedCupEntity.profitValue = newProfitValue;
        userJoinedCupEntity.profitRate = newProfitRate;

        await this.userJoinedCupRepository.update(
          {
            exchangeKeyId: userJoinedCupEntity.exchangeKeyId,
            userId: userJoinedCupEntity.userId,
            cupId: userJoinedCupEntity.cupId,
          },
          userJoinedCupEntity,
        );
      });

      await Promise.all(updateUserJoinedCupPromises);
    } catch (error) {
      console.log(`error updatedUserJoinedCupProfitValueAndProfitRate`, error);
    }
  }

  async checkIfUserReachedJoinCupLimit(userId: string) {
    const userJoinedCupEntitiesCounter = await this.userJoinedCupRepository
      .createQueryBuilder('user_joined_cups')
      .select('count(*)', 'count')
      .where('user_joined_cups.userId = :userId', { userId })
      .andWhere('user_joined_cups.deletedAt IS NULL')
      .innerJoin('user_joined_cups.cup', 'cup')
      .andWhere('cup.end_time >= :now', { now: new Date().toISOString() })
      .execute();

    const numberOfUserJoinedCups = userJoinedCupEntitiesCounter?.[0]?.count || 0;

    return numberOfUserJoinedCups >= 3;
  }

  async checkIfUserBalanceIsEnoughToJoinCup(exchangeKeyId: string, userId: string, cupId: string) {
    const today = moment().format('YYYY-MM-DD');

    const todayBalance = await this.userBalanceHistoryRepository.findOne({
      where: {
        date: today,
        user_id: userId,
        exchange_key_id: exchangeKeyId,
      },
    });

    if (!todayBalance) return false;

    const cup = await this.cupRepository.findOne(cupId);

    return Number(todayBalance.total_value) >= Number(cup.requirement);
  }

  async checkIfUserCanJoinCup(exchangeKeyId: string, userId: string, cupId: string) {
    try {
      const hasUserReachedNumberOfCupLimit = await this.checkIfUserReachedJoinCupLimit(userId);
      const isUserBalanceEnough = await this.checkIfUserBalanceIsEnoughToJoinCup(exchangeKeyId, userId, cupId);

      const errors = {
        balance: !isUserBalanceEnough,
        joinLimit: hasUserReachedNumberOfCupLimit,
      };

      return {
        status: !errors.balance && !errors.joinLimit,
        errors,
      };
    } catch (error) {
      console.log(`error checkIfUserCanJoinCup`, error);
      return {
        status: false,
        errors: {
          balance: true,
          joinLimit: true,
        },
      };
    }
  }

  async insertNewUserJoinedCup(userJoinedCupDTO: UserJoinCupDTO) {
    const { exchangeKeyId, userId, cupId } = userJoinedCupDTO;

    const userJoinedCupEntity = await this.userJoinedCupRepository.findOne({
      where: {
        exchangeKeyId,
        userId,
        cupId,
        deletedAt: null,
      },
    });

    if (userJoinedCupEntity) {
      throw new Error('User has already joined this cup!');
    }

    const cup = await this.cupRepository.findOne(userJoinedCupDTO.cupId);

    const newUserJoinedCup = new UserJoinedCup();

    Object.assign(newUserJoinedCup, {
      ...userJoinedCupDTO,
      rank: 0,
      initialBalance: 0,
      benefitYesterday: 0,
      totalBenefit: 0,
      profitRate: 0,
      profitValue: 0,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
      profitValue1d: 0,
      profitValue7d: 0,
      profitValue30d: 0,
      profitRate1d: 0,
      profitRate7d: 0,
      profitRate30d: 0,
      winrate: 0,
      winrate1d: 0,
      winrate7d: 0,
      winrate30d: 0,
      cup,
      time: new Date().toISOString(),
    });

    const response = await this.userJoinedCupRepository.save(newUserJoinedCup);

    return response;
  }
}
