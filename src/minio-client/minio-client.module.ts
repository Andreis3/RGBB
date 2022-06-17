import { Module } from '@nestjs/common';
import { MinioClientService } from './minio-client.service';
import { MinioModule } from 'nestjs-minio-client';
require('dotenv').config();
@Module({
  imports: [
    MinioModule.register({
      endPoint: process.env.MINIO_ENDPOINT,
      useSSL: true,
      region: process.env.MINIO_REGION,
      accessKey: process.env.MINIO_ACCESSKEY,
      secretKey: process.env.MINIO_SECRETKEY,
    }),
  ],
  providers: [MinioClientService],
  exports: [MinioClientService],
})
export class MinioClientModule {}
