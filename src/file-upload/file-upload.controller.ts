import { ACL_MINIO, CONTENT_TYPE_MINIO, EXPIRES_MINIO } from '../../constant';

require('dotenv').config();
import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
  Body,
  Param,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { AppMimeType, BufferedFile } from 'src/minio-client/file.model';
import * as AWS from 'aws-sdk';

@Controller('file-upload')
export class FileUploadController {
  constructor(private fileUploadService: FileUploadService) {}

  @Post('/getSignedUrl')
  async preSign(@Body() body) {
    try {
      const spacesEndpoint = new AWS.Endpoint(process.env.MINIO_ENDPOINT);
      const s3 = new AWS.S3({
        endpoint: spacesEndpoint,
        accessKeyId: process.env.MINIO_ACCESSKEY,
        secretAccessKey: process.env.MINIO_SECRETKEY,
      });

      return s3.getSignedUrl('putObject', {
        Bucket: process.env.MINIO_BUCKET,
        Key: body.fileName,
        ContentType: body.contentType,
        ACL: ACL_MINIO,
        Expires: EXPIRES_MINIO,
      });
    } catch (e) {
      console.error(e, 'errors get link pre_signUrl');
      throw 'GET_LINK_ERROR';
    }
  }

  @Post('single')
  @UseInterceptors(FileInterceptor('image'))
  async uploadSingle(@UploadedFile() image: BufferedFile) {
    return await this.fileUploadService.uploadSingle(image);
  }

  @Post('many')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image1', maxCount: 1 },
      { name: 'image2', maxCount: 1 },
    ]),
  )
  async uploadMany(@UploadedFiles() files: BufferedFile) {
    return this.fileUploadService.uploadMany(files);
  }
}
