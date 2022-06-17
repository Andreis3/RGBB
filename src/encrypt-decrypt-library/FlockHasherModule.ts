import { Global, Module } from '@nestjs/common';
import FlockHasher from './FlockHasher';

@Global()
@Module({
  providers: [
    {
      provide: 'FlockEncrypt',
      useClass: FlockHasher,
    },
  ],
  exports: [
    {
      provide: 'FlockEncrypt',
      useClass: FlockHasher,
    },
  ],
})
export default class FlockHasherModule {}
