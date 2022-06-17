import { IS_DEV } from 'config/secret';
import url = require('url');

export const convertURL = (redisUrl: string) => {
  const redis_uri = new url.URL(redisUrl);
  const result: any = {
    port: Number(redis_uri.port),
    host: redis_uri.hostname,
    password: redis_uri.password,
    db: 0,
  };

  if (!IS_DEV) {
    result.tls = {
      rejectUnauthorized: false,
    };
  }

  return result;
};
