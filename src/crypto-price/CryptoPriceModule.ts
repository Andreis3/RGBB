import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoPrice } from '../../entities';
import { CryptoPriceController } from './CryptoPriceController';
import { RedisCacheHelper } from '../../helpers/RedisCacheHelper';
import { CryptoPriceService } from '../../services/CryptoPriceService';

@Module({
  imports: [TypeOrmModule.forFeature([CryptoPrice])],
  controllers: [CryptoPriceController],
  providers: [CryptoPriceService, RedisCacheHelper],
})
export class CryptoPriceModule {}
