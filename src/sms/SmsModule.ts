import { Global, Module } from '@nestjs/common';
import SmsTwilio from './SmsTwilio';

@Global()
@Module({
  providers: [
    {
      provide: 'Sms',
      useClass: SmsTwilio,
    },
  ],
  exports: [
    {
      provide: 'Sms',
      useClass: SmsTwilio,
    },
  ],
})
export default class SmsModule {}
