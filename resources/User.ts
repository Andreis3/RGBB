export type User = {
  id: string;
};

export type Credential = {
  id: string;
  role: number;
};

export type DeviceToken = {
  id: string;
  device_token: string;
  flatform: string;
};

export type PayloadRegister = {
  input: {
    payload: {
      name: string;
      email: string;
      password: string;
      phone_number: string;
    };
  };
};
