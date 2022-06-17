import { Controller, Inject, HttpException, HttpStatus, Get, Query } from '@nestjs/common';

import { UserRepository } from '../../entities/User';
import { UserExchangesKeys } from '../../entities';

import { getConnection } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserJoinedCup, UserJoinedCupRepository } from '../../entities/UserJoinedCup';
@Controller()
export class VerifyController {
  @Inject()
  private readonly UserRepository: UserRepository;

  @InjectRepository(UserJoinedCupRepository)
  private userJoinedCupRepository: UserJoinedCupRepository;

  @Get('verify_redirect_del_account')
  async verifyDelAccount(@Query() query): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const user = await this.UserRepository.findOne(query);

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'LINK_VERIFY_DEL_ACCOUNT_WRONG',
          message: 'LINK_VERIFY_DEL_ACCOUNT_WRONG',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await getConnection()
      .createQueryBuilder()
      .update(UserExchangesKeys)
      .delete()
      .where('user_id = :user_id', { user_id: query.id })
      .execute();

    await this.UserRepository.update(user.id, {
      deleted_at: new Date(),
    });

    await getConnection()
      .createQueryBuilder()
      .update(UserJoinedCup)
      .update({ deletedAt: new Date() })
      .where('user_id = :user_id', { user_id: query.id })
      .execute();

    return {
      status: 'success',
    };
  }

  @Get('verify_redirect_email')
  async verifyEmail(@Query() query): Promise<{ status: string }> {
    //todo validate email and password req webhook
    const user = await this.UserRepository.findOne(query);

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'LINK_VERIFY_EMAIL_WRONG',
          message: 'LINK_VERIFY_EMAIL_WRONG',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.UserRepository.update(user.id, {
      is_verify_email: true,
    });

    return {
      status: 'success',
    };
  }
}
