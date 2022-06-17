export type PayloadJwt = {
  user_id: string;
  email: string;
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': ['user', 'admin'];
    'x-hasura-default-role': string;
    'x-hasura-role': string;
    'x-hasura-user-id': string;
  };
};
