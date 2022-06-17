import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities';

@Injectable()
export class UserService {
  private userRepository: Repository<User>;

  constructor(@InjectRepository(User) userRepository: Repository<User>) {
    this.userRepository = userRepository;
  }

  async findAllUserId() {
    return await this.userRepository.find({
      select: ['id'],
    });
  }

  async countUserRecords() {
    return await this.userRepository.count({
      where: {
        deleted_at: null,
      },
    });
  }

  async getUserRecords(page: number, limit: number) {
    return await this.userRepository.find({
      select: ['id'],
      skip: page * limit,
      take: limit,
    });
  }
}
