import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Hasher } from './Hasher';
import * as bcrypt from 'bcrypt';

export default class BcryptHasher implements Hasher {
  @Inject()
  private readonly config: ConfigService;

  compare(text: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(text, hashed);
  }

  generate(text: string): Promise<string> {
    return bcrypt.hash(text, this.config.get('bcrypt.rounds'));
  }
}
