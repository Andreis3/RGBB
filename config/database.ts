import { normalize } from 'path';
import * as entities from '../entities';

export const databaseConfig = (): any => ({
  database: {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: false,
            ca: Buffer.from(process.env.DATABASE_CA, 'base64').toString('ascii'),
          }
        : false,
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
    entities: [],
    cli: {
      entitiesDir: 'entities',
    },
  },
  jwt: {
    privateKey: process.env.AUTH_PRIVATE_KEY,
    options: {
      expiresIn: process.env.AUTH_EXPIRED_DATE,
    },
  },
  bcrypt: {
    rounds: 10,
  },
  time: {
    time_delete: process.env.TIME_DELETE,
  },
  mail: {
    mail_user: process.env.SENDGRID_MAIL_USER,
    template_resend: process.env.SENDGRID_TEMPLATE_RESEND,
    template_send_link_del: process.env.SENDGRID_TEMPLATE_SEND_LINK_DEL,
    template_send_verify_email: process.env.SENDGRID_TEMPLATE_SEND_VERIFY_EMAIL,
    api_key: process.env.SENDGRID_API_KEY,
    verify_url: process.env.VERIFY_URL,
  },
  sms: {
    sms_id: process.env.TWILIO_ACCOUNT_SID,
    sms_token: process.env.TWILIO_AUTH_TOKEN,
    sms_phone: process.env.TWILIO_PHONE_NUMBER,
  },
  minio: {
    minio_endpoint: process.env.MINIO_ENDPOINT,
    minio_endpoint_public: process.env.MINIO_ENDPOINT_PUBLIC,
    minio_port: process.env.MINIO_PORT,
    minio_accesskey: process.env.MINIO_ACCESSKEY,
    minio_secretkey: process.env.MINIO_SECRETKEY,
    minio_bucket: process.env.MINIO_BUCKET,
    minio_expires: process.env.MINIO_EXPIRES,
  },
  api_key: {
    algorithm: process.env.ALGORITHM,
    encryptionKey: process.env.ENCRYPTION_KEY,
    salt: process.env.SALT,
  },
  redis: {
    redis_url: process.env.REDIS_URL,
  },
});

export default databaseConfig();
