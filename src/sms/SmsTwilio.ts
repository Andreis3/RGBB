import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sms } from './Sms';
import { Twilio } from 'twilio';
export default class SmsTwilio implements Sms {
  @Inject()
  private readonly config: ConfigService;

  async sendSms(phone: string, code: string): Promise<any> {
    const client = new Twilio(this.config.get('sms.sms_id'), this.config.get('sms.sms_token'));

    return await client.messages.create({
      from: this.config.get('sms.sms_phone'),
      to: phone,
      body: `You just sent an SMS from FlockTrade : ${code}`,
    });
  }
}
