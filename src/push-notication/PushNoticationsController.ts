import { Controller, Inject, Post, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { OneSignalService } from '../../services/OneSignalService';
import { Request, Response } from 'express';

@Controller()
export class PushNoticationsController {
  @Inject(OneSignalService)
  private readonly onesignalService: OneSignalService;

  @Post('/push-notification')
  async pushNotification(@Req() request: Request, @Res() response: Response) {
    const result = await this.onesignalService.sendPushNotification();
    if (result['statusCode'] === 200)
      return response.status(HttpStatus.OK).send({ message: 'Push notification success.' });
    else response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Push notification error' });
  }
}
