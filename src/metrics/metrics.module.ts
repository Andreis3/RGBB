import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
  imports: [
    PrometheusModule.register({
      controller: MetricsController,
    }),
  ],
})
export class MetricsModule {}
