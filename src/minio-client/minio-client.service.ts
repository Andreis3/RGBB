import { Injectable, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { BufferedFile } from './file.model';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioClientService {
  @Inject()
  private readonly config: ConfigService;

  public get client() {
    return this.minio.client;
  }

  constructor(private readonly minio: MinioService) {}

  public async upload(file: BufferedFile) {
    if (!(file.mimetype.includes('jpeg') || file.mimetype.includes('png') || file.mimetype.includes('jpg'))) {
      throw new HttpException('Error uploading file', HttpStatus.BAD_REQUEST);
    }

    try {
      const temp_filename = Date.now().toString();
      const hashedFileName = crypto.createHash('md5').update(temp_filename).digest('hex');
      const ext = file.originalname.substring(file.originalname.lastIndexOf('.'), file.originalname.length);
      const metaData = {
        'Content-Type': file.mimetype,
        'X-Amz-Acl': 'public-read',
      };
      const filename = hashedFileName + ext;
      const fileName = `${filename}`;
      const fileBuffer = file.buffer;
      await this.client.putObject(this.config.get('minio.minio_bucket'), fileName, fileBuffer, metaData);

      return {
        url: `${this.config.get('minio.minio_endpoint_public')}/${this.config.get('minio.minio_bucket')}/${fileName}`,
        fileName,
      };
    } catch (e) {
      console.error('Error uploading file', e);
      throw new HttpException('Error uploading file', HttpStatus.BAD_REQUEST);
    }
  }

  public async presignedGetObject(fileName) {
    return await this.client.presignedPutObject(this.config.get('minio.minio_bucket'), fileName);
  }
}
