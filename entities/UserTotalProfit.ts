import { Column, CreateDateColumn, Entity, EntityRepository, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import BaseRepository from './BaseRepository';

@Entity('user_total_profit')
export class UserTotalProfit {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'profit_value_1d',
  })
  profitValueDaily: number;

  @Column({
    name: 'profit_value_all_time',
  })
  profitValueAllTime: number;

  @Column({
    name: 'profit_rate_1d',
  })
  profitRateDaily: number;

  @Column({
    name: 'profit_rate_all_time',
  })
  profitRateAllTime: number;

  @Column({
    name: 'profit_value_30d',
  })
  profitValueMonthly: number;

  @Column({
    name: 'profit_rate_30d',
  })
  profitRateMonthly: number;

  @Column({
    name: 'profit_value_7d',
  })
  profitValueWeekly: number;

  @Column({
    name: 'profit_rate_7d',
  })
  profitRateWeekly: number;

  @Column({
    name: 'winrate_all_time',
  })
  winrateAllTime: number;

  @Column({
    name: 'winrate_1d',
  })
  winrate1d: number;

  @Column({
    name: 'winrate_7d',
  })
  winrate7d: number;

  @Column({
    name: 'winrate_30d',
  })
  winrate30d: number;

  @Column({
    name: 'exchanges',
  })
  exchanges: string;

  @Column({
    name: 'copyable',
  })
  copyable: boolean;

  @Column({
    name: 'uncopyable',
  })
  uncopyable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@EntityRepository(UserTotalProfit)
export class UserTotalProfitRepository extends BaseRepository<UserTotalProfit> {}
