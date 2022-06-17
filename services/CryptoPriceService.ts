import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, In, Repository } from 'typeorm';
import axios from 'axios';
import { CryptoPrice } from '../entities/CryptoPrice';
import { COINGEKO_MARKETS_API_URL, COINGEKO_MAX_PER_PAGE, CURRENCIES } from 'config/secret';

@Injectable()
export class CryptoPriceService {
  private cryptoPriceRepository: Repository<CryptoPrice>;
  private connection: Connection;

  constructor(
    @InjectRepository(CryptoPrice)
    cryptoPriceRepository: Repository<CryptoPrice>,
    @InjectConnection() connection: Connection,
  ) {
    this.cryptoPriceRepository = cryptoPriceRepository;
    this.connection = connection;
  }

  async update() {
    try {
      const cryptoNames = await this.findAll();
      if (cryptoNames.length == 0) {
        return true;
      }
      const dataCrawled = await this.execCrawlData(cryptoNames.map((item) => item.name));

      dataCrawled.map(async (item) => {
        await this.execUpdate(item.currency, item.data);
      });
      return true;
    } catch (error) {
      console.log('Error when try to update: ', error);
      return false;
    }
  }

  async findAll() {
    return await this.cryptoPriceRepository.find();
  }

  async execCrawlData(cryptoIds) {
    const currencies = CURRENCIES.split(',');
    const data = Promise.all(
      currencies.map((currency) => {
        return this.crawlData(currency, cryptoIds);
      }),
    );
    return data;
  }

  async crawlData(currency: string, cryptoIds) {
    const totalCrypto = cryptoIds.length;
    const result = {
      currency: currency,
      data: [],
    };
    const perPage = COINGEKO_MAX_PER_PAGE;

    let index, cryptoIdsChunked;
    for (index = 0; index < totalCrypto; index += perPage) {
      cryptoIdsChunked = cryptoIds.slice(index, index + perPage);
      const params = this.generateParams(currency, cryptoIdsChunked);
      const apiResult = await this.callCoingeckoAPI(params);
      const apiResultModified = apiResult.map((item) => {
        return {
          id: item.id,
          symbol: item.symbol,
          price: item.current_price,
        };
      });
      result.data.push(...apiResultModified);
    }
    return result;
  }

  async callCoingeckoAPI(params) {
    return axios
      .get(COINGEKO_MARKETS_API_URL, {
        params: params,
      })
      .then((response) => {
        return response.data;
      })
      .catch(function (error) {
        console.log('Crawl data from Coingecko error: ', error);
        return undefined;
      });
  }

  private generateParams(currency: string, cryptoIds) {
    const ids = cryptoIds.length > 0 ? cryptoIds.join(',') : '';
    return {
      vs_currency: currency,
      ids: ids,
    };
  }

  async execUpdate(currency, data) {
    await this.connection.transaction(async (manager) => {
      await manager.query(this.generateQuery(currency, data));
    });
  }

  generateQuery(currency, data) {
    let query = `UPDATE crypto_prices SET price = `;
    let updateCase = `CASE `;
    const inCondition = [];
    for (const item of data) {
      updateCase += `WHEN symbol = '${item.symbol}' THEN ${item.price} `;
      inCondition.push("'" + item.symbol + "'");
    }
    updateCase += `ELSE price END, updated_at = now() `;
    query += updateCase + `WHERE currency = '${currency}' AND symbol IN ` + `(${inCondition.join(',')});`;
    return query;
  }

  saveToRedis = (redisConnect, currency: string, cryptoPrices) => {
    const prefixKey = 'crypto-price:';
    redisConnect.set(
      prefixKey + currency,
      JSON.stringify(
        cryptoPrices.reduce(
          (acc, item) => ({
            ...acc,
            [item.symbol]: item.current_price,
          }),
          {},
        ),
      ),
    );
  };
}
