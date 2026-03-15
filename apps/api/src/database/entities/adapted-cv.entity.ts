import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Job } from './job.entity';

@Entity('adapted_cvs')
export class AdaptedCv {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'job_id', nullable: true })
  jobId: number;

  @ManyToOne(() => Job, (job) => job.adaptedCvs, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column({ name: 'relevance_score', nullable: true })
  relevanceScore: number;

  @Column({ name: 'keywords_found', nullable: true })
  keywordsFound: string; // JSON array

  @Column({ name: 'missing_skills', nullable: true })
  missingSkills: string; // JSON array

  @Column({ name: 'adapted_profile', nullable: true, type: 'text' })
  adaptedProfile: string;

  @Column({ name: 'top_experience', nullable: true, type: 'text' })
  topExperience: string; // JSON array

  @Column({ name: 'adapted_cv_text', nullable: true, type: 'text' })
  adaptedCvText: string;

  @Column({ name: 'job_description', nullable: true, type: 'text' })
  jobDescription: string;

  @Column({ name: 'user_cv_id', nullable: true })
  userCvId: number;

  @Column({ name: 'cover_letter', nullable: true, type: 'text' })
  coverLetter: string;

  @Column({ nullable: true, type: 'text' })
  advice: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
