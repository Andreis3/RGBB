import { Controller, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { UserTotalProfitService } from 'services/UserTotalProfitService';

@Controller('user-total-profit')
export class UserTotalProfitController {
  @Inject()
  private readonly userTotalProfitService: UserTotalProfitService;

  @Post('update')
  async updateUsersPositions(@Res() response: Response) {
    const res = await this.userTotalProfitService.updateUserTotalProfit();
    if (res) {
      response.status(HttpStatus.OK).send({ message: 'User Total Profit Updated Successfully' });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Update users positions failed' });
    }
  }
}
