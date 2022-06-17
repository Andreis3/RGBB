import { Injectable } from '@nestjs/common';
import { REDIS_URL } from 'config/secret';

import redis = require('redis');

@Injectable()
export class RedisCacheHelper {
  /**
   *
   * @param url
   */
  connect(url: string = REDIS_URL) {
    return redis.createClient({
      url: url,
      retry_strategy: (options) => {
        console.log(new Date(), options);
        return 10 * 1000; // reconnect after 10 seconds
      },
    });
  }

  async get(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.connect().get(key, function (err, result) {
        // reply is null when the key is missing
        resolve(result);
      });
    });
  }

  /**
   *
   * @param key string
   * @param value string
   */
  set(key: string, value: string) {
    this.connect().set(key, value);
  }

  del(key: string) {
    this.connect().del(key);
  }
}
