import { Credential as Definition } from '../resources';
import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  EntityRepository,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import User from './User';
import BaseRepository from './BaseRepository';

@Entity('credential')
export default class Credential implements Definition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    nullable: false,
  })
  role: number;

  // @OneToOne(() => User, (user) => user.credential, {
  //   nullable: false,
  // })
  // @JoinColumn()
  // user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  toJSON() {
    return {
      id: this.id,
      role: this.role,
    };
  }
}

@EntityRepository(Credential)
export class CredentialRepository extends BaseRepository<Credential> {}
