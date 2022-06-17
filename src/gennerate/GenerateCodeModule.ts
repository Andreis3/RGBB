import { Global, Module } from '@nestjs/common';
import GenerateCode from './GenerateCode';
@Global()
@Module({
  providers: [
    {
      provide: 'Gen',
      useClass: GenerateCode,
    },
  ],
  exports: [
    {
      provide: 'Gen',
      useClass: GenerateCode,
    },
  ],
})
export default class GenerateCodeModule {}
