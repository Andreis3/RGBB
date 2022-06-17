import { Column, Entity, EntityRepository, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import BaseRepository from './BaseRepository';
import { UserJoinedCup } from './UserJoinedCup';

@Entity('cups')
export class Cup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'start_time' })
  startTime: Date;

  @Column({ name: 'end_time' })
  endTime: Date;

  @Column({ name: 'prize' })
  prize: string;

  @Column({ name: 'requirement' })
  requirement: string;

  @Column({ name: 'avatar' })
  avatar: string;

  @Column({ name: 'exchange_name' })
  exchangeName: string;

  @Column({ name: 'is_hot' })
  isHot: boolean;

  @OneToOne(() => UserJoinedCup, (userJoinedCup) => userJoinedCup.cup)
  @JoinColumn({ name: 'id' })
  userJoinedCups: UserJoinedCup[];
}

@EntityRepository(Cup)
export class CupRepository extends BaseRepository<Cup> {}
