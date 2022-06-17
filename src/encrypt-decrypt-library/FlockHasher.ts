require('dotenv').config();
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HasherProvider } from './HasherProvider';
const crypto = require('crypto');
import * as fs from 'fs';

export default class FlockHasher implements HasherProvider {
  @Inject()
  private readonly config: ConfigService;

  encrypt(text: string): string {
    const encryptedData = crypto.publicEncrypt(
      {
        key: `${process.env.PUBLIC_KEY_PEM.replace(/\\n/gm, '\n')}`,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(text),
    );

    return encryptedData.toString('base64');
  }

  decrypt(encryptedData: string): string {
    const decryptedData = crypto.privateDecrypt(
      {
        key: `${process.env.PRIVATE_KEY_PEM.replace(/\\n/gm, '\n')}`,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
        passphrase: '',
      },
      Buffer.from(encryptedData, 'base64'),
    );

    return decryptedData.toString();
  }
}
