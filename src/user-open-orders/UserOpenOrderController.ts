import { Controller, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserOpenOrderService } from 'services/UserOpenOrderService';

@Controller('user-open-order')
export class UserOpenOrderController {
  @Inject(UserOpenOrderService)
  private readonly userOpenOrderService: UserOpenOrderService;

  @Post('update')
  async updateUsersPositions(@Req() request: Request, @Res() response: Response) {
    const res = await this.userOpenOrderService.updateUsersOpenOrders();
    if (res) {
      response.status(HttpStatus.OK).send({ message: 'Update users open order success' });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Update users open order success' });
    }
  }
}
