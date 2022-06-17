import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('place_orders')
export class PlaceOrders {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column({ name: 'symbol' })
  symbol: string;

  @Column({ name: 'side' })
  side: string;

  @Column({ name: 'position_side' })
  positionSide: string;

  @Column({ name: 'type' })
  type: string;

  @Column({ name: 'reduce_only' })
  reduceOnly: boolean;

  @Column({ name: 'exchange' })
  exchange: string;

  @Column({ name: 'quantity' })
  quantity: number;

  @Column({ name: 'place_type' })
  placeType: string;

  @Column({ name: 'time_in_force' })
  timeInForce: string;

  @Column({ name: 'price' })
  price: number;

  @Column({ name: 'status' })
  status: number;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'leader_order_id' })
  leaderOrderId: string;

  @Column({ name: 'leader_key_id' })
  leaderKeyId: string;

  @Column({ name: 'exchange_order_id' })
  exchangeOrderId: string;

  @Column({ name: 'user_key_id' })
  userKeyId: string;
}
