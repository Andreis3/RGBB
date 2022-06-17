import { Controller, Post, Inject, Res, Req, HttpStatus, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserBalanceService } from '../../services/UserBalanceService';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Controller('userBalance')
export class UserBalanceController {
  private userBalanceService: UserBalanceService;

  constructor(
    @Inject(UserBalanceService) userBalanceService: UserBalanceService,
    @InjectQueue(`${process.env.REDIS_PREFIX}_QUEUE_UPDATE_BALANCE`) private readonly balanceQueue: Queue,
  ) {
    this.userBalanceService = userBalanceService;
  }

  @Post()
  async updateUserBalance(@Req() request: Request, @Res() response: Response) {
    try {
      const result = await this.userBalanceService.updateBalanceHistories();
      if (result) {
        response.status(HttpStatus.OK).send({ message: 'Update balance histories success' });
      } else {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Update balance histories error' });
      }
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Update balance histories error' });
    }
  }

  @Post('/job')
  async updateBalanceOneUserByExchangeKey(@Body() body) {
    try {
      await this.balanceQueue.add(body.input);
      return {
        status: 'success',
      };
    } catch (e) {
      console.error('update job balance user error', e);
    }
  }
}
