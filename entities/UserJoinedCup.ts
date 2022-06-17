import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  EntityRepository,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import BaseRepository from './BaseRepository';
import { Cup } from './Cup';

@Entity('user_join_cups')
export class UserJoinedCup {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'cup_id' })
  cupId: string;

  @Column({ name: 'join_time' })
  joinTime: Date;

  @Column({ name: 'initial_balance' })
  initialBalance: number;

  @Column({ name: 'total_benefit' })
  totalBenefit: number;

  @Column({ name: 'benefit_yesterday' })
  benefitYesterday: number;

  @Column({ name: 'profit_value' })
  profitValue: number;

  @Column({ name: 'profit_rate' })
  profitRate: number;

  @Column({ name: 'exchange_key_id' })
  exchangeKeyId: string;

  @Column({ name: 'rank' })
  rank: number;

  @Column({
    name: 'profit_value_1d',
  })
  profitValue1d: number;

  @Column({
    name: 'profit_rate_1d',
  })
  profitRate1d: number;

  @Column({
    name: 'profit_value_7d',
  })
  profitValue7d: number;

  @Column({
    name: 'profit_rate_7d',
  })
  profitRate7d: number;

  @Column({
    name: 'profit_value_30d',
  })
  profitValue30d: number;

  @Column({
    name: 'profit_rate_30d',
  })
  profitRate30d: number;

  @Column({
    name: 'winrate',
  })
  winrate: number;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
  })
  deletedAt: Date;

  @OneToOne(() => Cup, (cup) => cup.userJoinedCups)
  @JoinColumn({ name: 'cup_id' })
  cup: Cup;
}

@EntityRepository(UserJoinedCup)
export class UserJoinedCupRepository extends BaseRepository<UserJoinedCup> {}
