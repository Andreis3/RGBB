import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFollows } from '../entities/UserFollows';

@Injectable()
export class UserFollowsService {
  private userFollowsRepository: Repository<UserFollows>;

  constructor(
    @InjectRepository(UserFollows)
    userFollowsRepository: Repository<UserFollows>,
  ) {
    this.userFollowsRepository = userFollowsRepository;
  }

  async findByLeaderKeyId(leaderKeyId: string): Promise<UserFollows[]> {
    return this.userFollowsRepository.find({
      where: {
        leaderKeyId: leaderKeyId,
      },
    });
  }
}
