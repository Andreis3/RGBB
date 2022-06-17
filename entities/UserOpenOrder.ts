import { Column, CreateDateColumn, Entity, EntityRepository, PrimaryColumn } from 'typeorm';
import BaseRepository from './BaseRepository';

@Entity('user_open_orders')
export class UserOpenOrder {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'exchange' })
  exchange: string;

  @Column({ name: 'exchange_key_id' })
  exchangeKeyId: string;

  @Column()
  amount: number;

  @Column()
  filled: number;

  @Column()
  remaining: number;

  @Column()
  type: string;

  @Column({ name: 'reduce_only' })
  reduceOnly: boolean;

  @Column({
    name: 'post_only',
  })
  postOnly: boolean;

  @Column()
  symbol: string;

  @Column({ name: 'datetime' })
  datetime: string;

  @Column({ name: 'price' })
  price: number;

  @Column({ name: 'side' })
  side: string;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'stop_price' })
  stopPrice: number;

  @Column({ name: 'activation_price' })
  activationPrice: number;

  @Column({ name: 'callback_rate' })
  callbackRate: number;

  @Column({ name: 'trail_value' })
  trailValue: number;

  @Column({ name: 'meta_data' })
  metaData: string;

  @Column({ name: 'trigger_by' })
  triggerBy: string;

  @Column({ name: 'market_price' })
  marketPrice: number;

  @Column({ name: 'order_id' })
  orderId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@EntityRepository(UserOpenOrder)
export class UserOpenOrderRepository extends BaseRepository<UserOpenOrder> {}
