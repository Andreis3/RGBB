export interface Sms {
  sendSms(phone: string, code: string): Promise<any>;
}
