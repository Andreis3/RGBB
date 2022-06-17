import { Column, CreateDateColumn, Entity, EntityRepository, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User as Definition } from '../resources';
import BaseRepository from './BaseRepository';

@Entity('user_exchanges_keys')
export default class UserExchangesKeys implements Definition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'key' })
  key: string;

  @Column({ name: 'secret_key' })
  secretKey: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'exchange' })
  exchange: string;

  @Column({ name: 'use_for_leader' })
  useForLeader: boolean;

  @Column({ name: 'is_selected' })
  isSelected: boolean;

  @Column({
    name: 'allow_others_copy_trade',
  })
  allowOthersCopyTrade: boolean;

  @Column({
    name: 'stop_all_copy_trade',
  })
  stopAllCopyTrade: boolean;

  @Column({
    name: 'is_deleted',
  })
  isDeleted: boolean;

  @Column({
    name: 'name',
  })
  name: string;

  @Column({
    name: 'is_public',
  })
  isPublic: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@EntityRepository(UserExchangesKeys)
export class UserExchangeKeyRepository extends BaseRepository<UserExchangesKeys> {}
