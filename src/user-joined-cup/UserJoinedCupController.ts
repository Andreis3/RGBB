import { BadRequestException, Body, Controller, HttpException, HttpStatus, Inject, Post } from '@nestjs/common';
import { UserJoinedCupService } from 'services/UserJoinedCupService';
import { PayloadUserJoinCupWebhook } from './payload/CheckUserCanJoinCupDTO';

@Controller('user-join-cup')
export class UserJoinCupController {
  @Inject()
  private readonly userJoinedCupService: UserJoinedCupService;

  @Post('/check')
  async checkUserCanJoinCUp(@Body() body: PayloadUserJoinCupWebhook) {
    const { userId, exchangeKeyId, cupId } = body.input;

    const { status, errors } = await this.userJoinedCupService.checkIfUserCanJoinCup(exchangeKeyId, userId, cupId);

    return {
      status,
      balanceError: errors.balance,
      joinLimitError: errors.joinLimit,
    };
  }

  @Post('/join')
  async joinCup(@Body() body: PayloadUserJoinCupWebhook) {
    try {
      const { userId, exchangeKeyId, cupId } = body.input;

      const { status } = await this.userJoinedCupService.checkIfUserCanJoinCup(exchangeKeyId, userId, cupId);

      if (!status) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Validate Error',
        });
      }

      await this.userJoinedCupService.insertNewUserJoinedCup(body.input);

      return {
        status: 'success',
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
