import { Module } from '@nestjs/common';
import { PushNoticationsController } from './PushNoticationsController';
import { OneSignalService } from '../../services/OneSignalService';
import { RedisCacheHelper } from '../../helpers/RedisCacheHelper';

@Module({
  imports: [],
  providers: [OneSignalService, RedisCacheHelper],
  controllers: [PushNoticationsController],
})
export class PushNotificationModule {}
