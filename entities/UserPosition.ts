import { Column, CreateDateColumn, Entity, EntityRepository, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import BaseRepository from './BaseRepository';

@Entity('user_positions')
export default class UserPosition {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column()
  user_id: string;

  @Column()
  exchange_key_id: string;

  @Column()
  exchange: string;

  @Column()
  symbol: string;

  @Column()
  roe: number;

  @Column()
  leverage: number;

  @Column()
  amount: number;

  @Column()
  entry_price: number;

  @Column()
  realized_profit: number;

  @Column()
  unrealized_profit: number;

  @Column()
  margin_type: string;

  @Column()
  isolated_margin: number;

  @Column()
  mark_price: number;

  @Column()
  liquidation_price: number;

  @Column()
  position_side: string;

  @Column()
  info: string;

  @Column()
  total_amount: number;

  @Column()
  matched_amount: number;

  @Column()
  hold: number;

  @Column()
  is_hedge: boolean;

  @Column()
  status: string;

  @Column()
  type: string;

  @Column()
  total_value: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@EntityRepository(UserPosition)
export class UserPositionRepository extends BaseRepository<UserPosition> {}
