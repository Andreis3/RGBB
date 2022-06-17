import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_balance_history_details')
export class UserBalanceHistoryDetail {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column()
  crypto_symbol: string;

  @Column()
  amount: number;

  @Column()
  user_id: string;

  @Column()
  exchange_name: string;

  @Column()
  type: string;

  @Column()
  created_at: string;

  @Column()
  exchange_key_id: string;

  @Column()
  date: Date;
}
