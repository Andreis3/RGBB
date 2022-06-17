import { Controller, Post, Inject, Res, Req, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { CryptoPriceService } from '../../services/CryptoPriceService';

@Controller('cryptoPrice')
export class CryptoPriceController {
  private cryptoPriceService: CryptoPriceService;

  constructor(@Inject(CryptoPriceService) cryptoPriceService: CryptoPriceService) {
    this.cryptoPriceService = cryptoPriceService;
  }

  @Post('/update')
  async updateCryptoPrice(@Req() request: Request, @Res() response: Response) {
    const result = await this.cryptoPriceService.update();
    if (result) {
      response.status(HttpStatus.OK).send({ message: 'Update success' });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Update error' });
    }
  }
}
