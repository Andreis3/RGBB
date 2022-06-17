import { Controller, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserPositionsService } from 'services/UserPositionsService';

@Controller('user-position')
export class UserPositionController {
  @Inject(UserPositionsService)
  private readonly userPositionsService: UserPositionsService;

  @Post('update')
  async updateUsersPositions(@Req() request: Request, @Res() response: Response) {
    const res = await this.userPositionsService.updateUserPositions();
    if (res) {
      response.status(HttpStatus.OK).send({ message: 'Update users positions success' });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Update users positions failed' });
    }
  }
}
