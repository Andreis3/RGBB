// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const getEnv = (key: string, ignore = false) => {
  const value = process.env[key];
  if (!ignore && value === undefined) {
    console.log(`[ENV] ${key} not found!`);
  }
  return value;
};

// REDIS
export const REDIS_URL = getEnv('REDIS_URL');
export const REDIS_PREFIX = getEnv('REDIS_PREFIX');
export const QUEUE_UPDATE_BALANCE = `${REDIS_PREFIX}_QUEUE_UPDATE_BALANCE`;
export const QUEUE_SCHEDULED_JOB_UPDATE_POSITION = `${REDIS_PREFIX}_QUEUE_SCHEDULED_JOB_UPDATE_POSITION`;
export const QUEUE_SCHEDULED_JOB_UPDATE_OPEN_ORDER = `${REDIS_PREFIX}_QUEUE_SCHEDULED_JOB_UPDATE_OPEN_ORDER`;
export const QUEUE_SCHEDULED_JOB_PUSH_NOTIFICAION = `${REDIS_PREFIX}_QUEUE_SCHEDULED_JOB_PUSH_NOTIFICATION`;

// GLOBAL
export const IS_DEV = getEnv('NODE_ENV') !== 'production';

// COINGEKO
export const CURRENCIES = 'USD';
export const COINGEKO_MAX_PER_PAGE = 250;
export const COINGEKO_MARKETS_API_URL = 'https://api.coingecko.com/api/v3/coins/markets';

// EXCHANGE
export const TOKOCRYPTO_BASE_URL = 'https://www.tokocrypto.com';
let BINANCE_BASE_URL = '';
let BYBIT_BASE_URL = '';

if (IS_DEV) {
  BINANCE_BASE_URL = 'https://testnet.binancefuture.com';
  BYBIT_BASE_URL = 'https://api-testnet.bybit.com';
} else {
  BINANCE_BASE_URL = 'https://fapi.binance.com';
  BYBIT_BASE_URL = 'https://api.bybit.com';
}

export { BINANCE_BASE_URL, BYBIT_BASE_URL };
