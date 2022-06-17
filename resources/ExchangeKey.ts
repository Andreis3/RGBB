export type ExchangeKey = {
  id: number;
  user_id: number;
  secret_key: string;
  exchange_broker: string;
};

export type TExchangeKeyParam = {
  key: string;
  secretKey: string;
};
