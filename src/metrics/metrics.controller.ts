import { Controller, Get, Res, Response } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { PrometheusController } from '@willsoto/nestjs-prometheus';

@Controller('metrics')
export class MetricsController extends PrometheusController {
  @Get()
  async index(@Res() response: Response) {
    await super.index(response);
  }
}
