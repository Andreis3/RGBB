import { Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { PlaceOrdersService } from '../../services/PlaceOrdersService';

@Controller()
export class PlaceOrdersController {
  private placeOrdersService: PlaceOrdersService;

  constructor(@Inject(PlaceOrdersService) placeOrdersService: PlaceOrdersService) {
    this.placeOrdersService = placeOrdersService;
  }

  @Post('/copyTrades')
  placeOrders(@Req() req, @Res() res) {
    this.placeOrdersService.copyTrades(req.body);
    res.status(200).send('Copy trades processing');
  }
}
