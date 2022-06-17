import { ConflictException, Inject, Injectable, HttpException, HttpStatus, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { UserRepository } from '../../entities/User';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  @Inject()
  private readonly userRepository: UserRepository;

  @Inject()
  private readonly config: ConfigService;

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeaders = req.headers.authorization;
    if (authHeaders && (authHeaders as string).split(' ')[1]) {
      const token = (authHeaders as string).split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, this.config.get('jwt.privateKey'));
        const user = await this.userRepository.findOne(decoded.id);
        if (!user) {
          throw new HttpException('User not found.', HttpStatus.UNAUTHORIZED);
        }

        next();
      } catch (error) {
        throw new HttpException('User not found.', HttpStatus.UNAUTHORIZED);
      }
    } else {
      throw new HttpException('Not authorized.', HttpStatus.UNAUTHORIZED);
    }
  }
}
