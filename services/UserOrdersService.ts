import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserOrders } from '../entities';

@Injectable()
export class UserOrdersService {
  @InjectRepository(UserOrders)
  private userOrdersRepository: Repository<UserOrders>;

  async findByOrderIdAndUserIdAndDateTime(orderId, userId, datetime, exchangeName, id): Promise<UserOrders> {
    const data = await this.userOrdersRepository.find({
      where: {
        orderId,
        userId,
        datetime,
        exchangeName,
        id,
      },
    });

    return data?.[0];
  }
}
