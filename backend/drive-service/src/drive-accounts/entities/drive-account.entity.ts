import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'drive_accounts' })
export class DriveAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'bigint', default: 0 })
  totalSpace: number;

  @Column({ type: 'bigint', default: 0 })
  usedSpace: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string;
}
export class DriveAccount {}
