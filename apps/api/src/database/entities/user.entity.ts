import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';

export type AuthProvider = 'local' | 'google';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true, type: 'text' })
  passwordHash: string | null;

  @Column({ nullable: true, type: 'text' })
  name: string | null;

  @Column({ type: 'text', default: 'local' })
  provider: AuthProvider;

  @Column({ name: 'google_id', nullable: true, unique: true, type: 'text' })
  googleId: string | null;

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl: string | null;

  @Column({ name: 'email_verified', default: false, type: 'boolean' })
  emailVerified: boolean;

  @Column({ name: 'email_verify_token', nullable: true, type: 'text' })
  emailVerifyToken: string | null;

  @Column({ name: 'email_verify_expires', nullable: true, type: 'datetime' })
  emailVerifyExpires: Date | null;

  @Column({ name: 'reset_token_hash', nullable: true, type: 'text' })
  resetTokenHash: string | null;

  @Column({ name: 'reset_token_expires', nullable: true, type: 'datetime' })
  resetTokenExpires: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];
}
