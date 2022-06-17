import { Body, Controller, Inject, Post } from '@nestjs/common';
import { CupRepository } from '../../entities/Cup';
import * as moment from 'moment';
import { getManager } from 'typeorm';
import { UserJoinedCup, UserJoinedCupRepository } from '../../entities/UserJoinedCup';

@Controller('user_rank')
export class UserRankController {
  @Inject()
  private readonly CupRepository: CupRepository;

  @Inject()
  private readonly UserJoinedCupRepository: UserJoinedCupRepository;

  @Post('/job')
  async addCupIdByQueueRank(@Body() body): Promise<any> {
    console.log('start add cup in job update rank', new Date());

    try {
      const time_cup_end = moment().subtract(1, 'days').format('YYYY-MM-DD');
      const entityManager = getManager();
      const cups = await entityManager.query("select * from cups as u where to_char(u.end_time, 'YYYY-MM-DD') = $1", [
        time_cup_end,
      ]);

      await Promise.all(
        cups.map(async (cup, index) => {
          await this.handleUpdateRankByCup(cup.id);
        }),
      );

      return {
        status: 'success',
      };
    } catch (e) {
      console.error('update job ranking user error', e);
    }
  }

  async handleUpdateRankByCup(cup_id: string) {
    console.log(`Start update rank ${cup_id} : ${new Date()}`);

    const users = await this.UserJoinedCupRepository.find({
      where: {
        cupId: cup_id,
      },
      order: {
        profitRate: 'DESC',
        joinTime: 'ASC',
      },
    });

    await Promise.all(
      users.map(async (record: UserJoinedCup, index) => {
        await this.UserJoinedCupRepository.save({
          rank: index + 1,
          cupId: record.cupId,
          userId: record.userId,
          time: record.time,
        });
      }),
    );
  }
}
