import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_orders')
export class UserOrders {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'exchange_name' })
  exchangeName: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'symbol' })
  symbol: string;

  @Column({ name: 'datetime' })
  datetime: string;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'side' })
  side: string;

  @Column({ name: 'type' })
  type: string;

  @Column({ name: 'amount' })
  amount: string;

  @Column({ name: 'price' })
  price: string;

  @Column({ name: 'id' })
  id: number;

  @Column({ name: 'stop_price' })
  stopPrice: number;

  @Column({ name: 'callback_rate' })
  callbackRate: number;

  @Column({ name: 'activation_price' })
  activationPrice: number;

  @Column({ name: 'time_in_force' })
  timeInForce: string;
}
