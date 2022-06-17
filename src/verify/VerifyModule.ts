import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { VerifyController } from './VerifyController';

@Module({
  imports: [],
  providers: [],
  controllers: [VerifyController],
  exports: [],
})
export class VerifyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply().forRoutes('/verify');
  }
}
