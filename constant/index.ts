export const ORDER_TYPE = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
  TAKE_PROFIT: 'TAKE_PROFIT',
  TAKE_PROFIT_MARKET: 'TAKE_PROFIT_MARKET',
  TRAILING_STOP_MARKET: 'TRAILING_STOP_MARKET',
  STOP: 'STOP',
  STOP_MARKET: 'STOP_MARKET',
};

export const EXCHANGES = {
  BINANCE: 'binance',
  FTX: 'ftx',
  BYBIT: 'bybit',
  TOKOCRYPTO: 'tokocrypto',
  INDODAX: 'indodax',
};

export const PLACE_ORDER_STATUS = {
  SUCCESS: 0,
  FAILED: 1,
};

export const ORDER_STATUS = {
  NEW: 'NEW',
  CANCELED: 'CANCELED',
  FILLED: 'FILLED',
};

export const EVENT_TRIGGER = {
  UPDATE_API_KEY: 'update_api_keys',
  UPDATE_USER_JOINED_CUPS: 'update_user_joined_cups',
  USER_FOLLOW_LEADER: 'user_follow_leader',
  PUSH_NOTIFICATION: 'push_notification',
};

export const TRIGGER_OPERATION = {
  DELETE: 'DELETE',
  INSERT: 'INSERT',
};

export const REDIS_API_KEY_PREFIX = `FLOCKTRADE_SOCKET_KEY`;
export const RECV_WINDOW = 10000000;

export const BALANCE_DETAIL_TYPE = {
  BALANCE: 'balance',
  DEPOSIT: 'deposit',
  WITHDRAW: 'withdraw',
};
export const NUMBER_OF_REPLACE_ORDER = 10;

export const MARGIN_TYPE = {
  ISOLATED: 'isolated',
  CROSSED: 'cross',
};

export const START_TIME = {
  POSITION_OPENS: 'POSITION_OPENS',
  IMMEDIATELY: 'IMMEDIATELY',
};

export const SIXTY_SECONDS = 60 * 1000;

export const NUMBER_OF_FETCH_POSITION_RETRY = 10;
export const NUMBER_OF_FETCH_OPEN_ORDER_RETRY = 10;
export const NUMBER_OF_UPDATE_USER_TOTAL_PROFIT_RETRY = 10;
export const EXCHANGE_KEYS_CHUNK_SIZE = 10;
export const USER_CHUNK_SIZE = 10;
export const LIST_EXCHANGE_FETCH_SYMBOLS = [EXCHANGES.BINANCE, EXCHANGES.BYBIT, EXCHANGES.FTX];
export const TIME_RUN_JOB_UPDATE_BALANCE = 1;
export const MIN_GENERATE = 1000;
export const MAX_GENERATE = 8000;
export const CONTENT_TYPE_MINIO = 'image/*';
export const ACL_MINIO = 'public-read';
export const EXPIRES_MINIO = 300;

export const USER_NOTIFICATION_KEY = 'user:pushNotification';
export const TYPE_MES = {
  test: {
    contents: {
      en: 'Flock Trade test push notification!',
    },
    headings: {
      en: 'FlockTrade',
    },
    subtitle: {
      en: 'FlockTrade subtitle',
    },
  },
  update: {
    contents: {
      en: 'Flock Trade test push notification!',
    },
    headings: {
      en: 'FlockTrade',
    },
    subtitle: {
      en: 'FlockTrade subtitle',
    },
  },
};
