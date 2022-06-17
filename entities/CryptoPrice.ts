import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('crypto_prices')
export class CryptoPrice {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column()
  price: number;

  @Column()
  created_at: string;

  @Column()
  updated_at: string;

  @Column()
  currency: string;
}
