import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_follows')
export class UserFollows {
  @PrimaryColumn({ name: 'time' })
  time: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'follower_id' })
  followerId: string;

  @Column({ name: 'key_id' })
  keyId: string;

  @Column({ name: 'leader_key_id' })
  leaderKeyId: string;

  @Column({ name: 'activated' })
  activated: boolean;
}
