import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadController } from './file-upload.controller';
import { MinioClientModule } from 'src/minio-client/minio-client.module';
import { logger } from '../middleware/LoggerMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

@Module({
  imports: [MinioClientModule],
  providers: [FileUploadService],
  controllers: [FileUploadController],
  exports: [FileUploadService],
})
export class FileUploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('/file');
  }
}
