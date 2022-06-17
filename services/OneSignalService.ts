import * as OneSignal from 'onesignal-node';
import { TYPE_MES } from 'constant';
import { RedisCacheHelper } from 'helpers/RedisCacheHelper';
import { Inject } from '@nestjs/common';
const client = new OneSignal.Client(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_API_KEY);
import { USER_NOTIFICATION_KEY } from 'constant';

export class OneSignalService {
  constructor(
    @Inject(RedisCacheHelper)
    private readonly redisCacheHelper: RedisCacheHelper,
  ) {}

  async sendPushNotification() {
    const dataPushCache: string = await this.redisCacheHelper.get(USER_NOTIFICATION_KEY);
    if (!dataPushCache || (dataPushCache && JSON.parse(dataPushCache).length === 0)) {
      return false;
    }
    const dataPush = JSON.parse(dataPushCache);
    return new Promise((res, rej) => {
      if (dataPush['players_id'] === undefined || dataPush['players_id'].length === 0) {
        return res({});
      }
      const notification = {
        isIos: true,
        include_player_ids: dataPush['players_id'],
      };
      const obj = { ...notification, ...TYPE_MES[dataPush.type] };
      return client
        .createNotification(obj)
        .then((response) => {
          this.redisCacheHelper.del(USER_NOTIFICATION_KEY);
          return res(response);
        })
        .catch((error) => {
          console.log(error);
          return res(error);
        });
    });
  }
}
