import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { AdaptedCv } from './adapted-cv.entity';
import { User } from './user.entity';

export type JobStatus =
  | 'New'
  | 'Saved'
  | 'Applied'
  | 'Screening'
  | 'Technical'
  | 'Final Round'
  | 'Offer'
  | 'Rejected'
  | 'Archived';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'scrape_id', unique: true, nullable: true })
  scrapeId: string;

  @Column()
  company: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  salary: string;

  @Column({ name: 'salary_raw', default: 0 })
  salaryRaw: number;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'tech_stack', nullable: true })
  techStack: string;

  @Column({ default: 'New' })
  status: JobStatus;

  @Column({ default: 3 })
  priority: number;

  @Column({ name: 'applied_date', nullable: true })
  appliedDate: string;

  @Column({ nullable: true })
  contact: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 'manual' })
  source: string;

  @Column({ name: 'description_preview', nullable: true })
  descriptionPreview: string;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AdaptedCv, (cv) => cv.job)
  adaptedCvs: AdaptedCv[];
}
