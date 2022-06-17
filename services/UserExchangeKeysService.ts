import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { UserExchangesKeys } from '../entities';

@Injectable()
export class UserExchangeKeysService {
  private userExchangeKeysRepository: Repository<UserExchangesKeys>;

  constructor(
    @InjectRepository(UserExchangesKeys)
    userExchangeKeysRepository: Repository<UserExchangesKeys>,
  ) {
    this.userExchangeKeysRepository = userExchangeKeysRepository;
  }

  async findByApiKey(apiKey: string): Promise<UserExchangesKeys[]> {
    return await this.userExchangeKeysRepository.find({
      where: {
        key: apiKey,
      },
    });
  }

  async findById(id: string): Promise<UserExchangesKeys> {
    return await this.userExchangeKeysRepository.findOne(id);
  }

  async countRecords(): Promise<number> {
    return this.userExchangeKeysRepository.count();
  }

  async findByListIdIn(listId): Promise<UserExchangesKeys[]> {
    return await this.userExchangeKeysRepository.find({
      where: {
        id: In(listId),
      },
    });
  }

  async findByUserIdAndIsSelected(users, isSelected) {
    return await this.userExchangeKeysRepository.find({
      select: ['id', 'userId', 'key', 'secretKey', 'exchange'],
      where: {
        isSelected: isSelected,
        userId: In(users.map((item) => item.id)),
      },
    });
  }

  async getUserExchangeKeysRecords(page: number, limit: number, conditions = {}): Promise<UserExchangesKeys[]> {
    return this.userExchangeKeysRepository.find({
      select: ['id', 'userId', 'key', 'secretKey', 'exchange'],
      skip: page * limit,
      take: limit,
      where: conditions,
    });
  }

  async doesUserHasAtLeastOneCopyableKey(userId: string): Promise<boolean> {
    const count = await this.userExchangeKeysRepository.count({
      where: {
        userId: userId,
        allowOthersCopyTrade: true,
      },
    });
    return count > 0;
  }

  async doesUserHasAtLeastOneUnCopyableKey(userId: string): Promise<boolean> {
    const count = await this.userExchangeKeysRepository.count({
      where: {
        userId: userId,
        allowOthersCopyTrade: false,
      },
    });
    return count > 0;
  }

  async getExchangeNamesWhichUserHasKeys(userId: string): Promise<string[]> {
    const keys = await this.userExchangeKeysRepository.find({
      where: {
        userId: userId,
      },
    });

    return keys?.length > 0 && [...new Set(keys.map((item) => item.exchange))];
  }
}
