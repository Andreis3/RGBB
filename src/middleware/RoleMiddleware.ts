import { ConflictException, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { UserRepository } from '../../entities/User';

@Injectable()
export class RoleMiddleware implements NestMiddleware {
  @Inject()
  private readonly userRepository: UserRepository;

  async use(req: Request, res: Response, next: NextFunction) {
    const id = req.body.session_variables['x-hasura-user-id'];
    const credential = await this.userRepository.findOne({
      id,
    });
    if (credential) {
      throw new ConflictException(`user already exists`);
    }
    next();
  }
}
