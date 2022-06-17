import { Column, Entity, EntityRepository, PrimaryColumn } from 'typeorm';
import BaseRepository from './BaseRepository';

@Entity('user_balance_histories')
export class UserBalanceHistory {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column()
  user_id: string;

  @Column()
  exchange_key_id: string;

  @Column()
  exchange_name: string;

  @Column()
  date: Date;

  @Column()
  total_value: number;

  @Column()
  currency_unit: string;

  @Column()
  deposit_amount: number;

  @Column()
  withdraw_amount: number;

  @Column()
  profit: number;

  @Column()
  profit_rate: number;

  @Column()
  created_at: string;

  @Column()
  updated_at: string;
}

@EntityRepository(UserBalanceHistory)
export class UserBalanceHistoryRepository extends BaseRepository<UserBalanceHistory> {}
