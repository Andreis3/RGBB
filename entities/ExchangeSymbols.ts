import { Column, Entity, EntityRepository, PrimaryColumn, Repository } from 'typeorm';

@Entity('symbols')
export class ExchangeSymbols {
  @PrimaryColumn({ name: 'symbol' })
  symbol: string;

  @Column({ name: 'token' })
  token: string;

  @Column({ name: 'quote_token' })
  quoteToken: string;

  @Column({ name: 'exchange' })
  exchange: string;
}

@EntityRepository(ExchangeSymbols)
export class ExchangeSymbolsRepository extends Repository<ExchangeSymbols> {}
