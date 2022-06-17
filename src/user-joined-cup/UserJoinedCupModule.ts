import { Module } from '@nestjs/common';
import { UserJoinedCupService } from 'services/UserJoinedCupService';
import { UserJoinCupController } from './UserJoinedCupController';

@Module({
  imports: [],
  controllers: [UserJoinCupController],
  providers: [UserJoinedCupService],
})
export class UserJoinedCupModule {}
