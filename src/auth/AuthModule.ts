import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './AuthService';
import { AuthController } from './AuthController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { logger } from '../middleware/LoggerMiddleware';
import { FileUploadModule } from '../file-upload/file-upload.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.privateKey'),
        signOptions: configService.get('jwt.options'),
      }),
      inject: [ConfigService],
    }),
    FileUploadModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(logger).forRoutes('/auth');
  }
}
