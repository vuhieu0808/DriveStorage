import { Entity, PrimaryGeneratedColumn, Column, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { IsEmail } from 'class-validator';
// import { User } from '../../users/entities/user.entity'; 

@Entity({ name: 'drive_accounts' })
@Unique('uq_drive_account_email', ['userId', 'email']) 
export class DriveAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  // @ManyToOne(() => User, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'userId' })
  // user!: User;

  @IsEmail()
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'text', nullable: true }) 
  accessToken?: string | null; 

  @Column({ type: 'text' })
  refreshToken!: string;

  @Column({ type: 'bigint', default: '16106127360' }) 
  totalSpace!: string;

  @Column({ type: 'bigint', default: '0' }) 
  usedSpace!: string;

  @Column({ type: 'varchar', length: 20, default: 'online' }) // online, offline, full, error
  status!: string; 
}