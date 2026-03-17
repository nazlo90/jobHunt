import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('scraper_profiles')
export class ScraperProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Default' })
  name: string;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

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

  /**
   * Source-specific scraper settings. All keys are optional.
   * Example:
   * {
   *   greenhouseCompanies: ['stripe', 'airbnb'],
   *   douCategories: ['Front End', 'JavaScript'],
   *   remoteOKCategories: ['frontend', 'javascript'],
   *   remotiveCategory: 'software-dev',
   *   wwrCategory: 'remote-programming-jobs',
   *   theMuseCategories: ['Software Engineer'],
   *   theMuseLevels: ['Senior Level'],
   *   wellfoundRoles: ['Frontend Engineer'],
   *   djinniFallbackCategories: ['Angular', 'React', 'JavaScript'],
   * }
   */
  @Column({ name: 'source_config', type: 'simple-json', nullable: true })
  sourceConfig: Record<string, any> | null;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
