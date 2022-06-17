import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  EntityRepository,
  OneToOne,
  JoinColumn,
  DeleteDateColumn,
  BeforeInsert,
  PrimaryColumn,
} from 'typeorm';
import { v4 as uuid4 } from 'uuid';
import { User as Definition } from '../resources';
import Credential from '../entities/Credential';
import BaseRepository from './BaseRepository';

@Entity('users')
export default class User implements Definition {
  @PrimaryColumn({ type: 'uuid', generated: 'uuid' })
  id: string;

  @Column({
    nullable: true,
  })
  user_name: string;

  @Column({
    nullable: true,
  })
  full_name: string;

  @Column({
    nullable: true,
  })
  phone_code: string;

  @Column({
    nullable: true,
  })
  description: string;

  @Column({
    nullable: true,
  })
  avatar: string;

  @Column({
    nullable: true,
  })
  password: string;

  @Column({
    nullable: true,
  })
  login_type: number;

  @Column({
    nullable: false,
  })
  expired_date: Date;

  @Column({
    nullable: true,
  })
  phone_number: string;

  @Column({
    nullable: false,
  })
  email: string;

  @Column({
    nullable: false,
  })
  is_verify_code: boolean;

  @Column({
    nullable: false,
  })
  is_verify_email: boolean;
  // @OneToOne(() => Credential, (credential) => credential.user, {
  //   nullable: true,
  // })
  // @JoinColumn()
  // credential: Credential;

  @Column({
    nullable: true,
  })
  code: string;

  @Column({
    nullable: true,
  })
  code_delete: string;

  @Column({
    nullable: true,
  })
  code_verify_email: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}

@EntityRepository(User)
export class UserRepository extends BaseRepository<User> {}
