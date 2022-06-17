import { Controller, Inject, Post, Res } from '@nestjs/common';
import { ExchangeSymbolsService } from '../../services/ExchangeSymbolsService';

@Controller('/symbols')
export class ExchangeSymbolsController {
  @Inject()
  private exchangeSymbolsService: ExchangeSymbolsService;

  @Post('/update')
  async update(@Res() res) {
    const response = await this.exchangeSymbolsService.updateSymbols();

    if (response) {
      return res.status(200).send({ message: 'update symbols success' });
    } else {
      return res.status(500).send({ message: 'Internal Server Error' });
    }
  }
}
