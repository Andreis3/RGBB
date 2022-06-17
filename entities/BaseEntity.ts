import {
  ObjectIdColumn,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @ObjectIdColumn()
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate?: Date;

  @Column({ nullable: true })
  lastModifiedBy?: string;

  @UpdateDateColumn({ type: 'timestamp' })
  lastModifiedDate?: Date;

  @Column({ nullable: true })
  removedBy?: string;

  @DeleteDateColumn({ type: 'timestamp' })
  removedDate?: Date;
}
