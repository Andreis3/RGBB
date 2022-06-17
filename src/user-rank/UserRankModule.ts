import { Module } from '@nestjs/common';
import { UserRankController } from './UserRankController';

@Module({
  controllers: [UserRankController],
})
export class UserRankModule {}
