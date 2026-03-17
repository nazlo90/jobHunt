import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('scraper_config')
export class ScraperConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'search_terms', type: 'simple-json' })
  searchTerms: string[];

  @Column({ name: 'min_salary', default: 0 })
  minSalary: number;

  @Column({ name: 'remote_only', default: true })
  remoteOnly: boolean;

  @Column({ name: 'strong_keywords', type: 'simple-json' })
  strongKeywords: string[];

  @Column({ name: 'additional_keywords', type: 'simple-json' })
  additionalKeywords: string[];

  @Column({ name: 'exclude_title', type: 'simple-json' })
  excludeTitle: string[];

  @Column({ name: 'exclude_keywords', type: 'simple-json' })
  excludeKeywords: string[];

  @Column({ name: 'require_strong_match', default: true })
  requireStrongMatch: boolean;

  @Column({ name: 'min_score', default: 2 })
  minScore: number;

  @Column({ name: 'enabled_sources', type: 'simple-json', nullable: true })
  enabledSources: string[] | null;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
