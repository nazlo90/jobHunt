import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScraperConfig } from './scraper-config.entity';
import { UpdateScraperConfigDto } from './update-scraper-config.dto';
import { readFileSync } from 'fs';
import { join } from 'path';

export const ALL_SOURCES = [
  'Djinni', 'RemoteOK', 'Wellfound', 'Remotive', 'WeWorkRemotely',
  'HackerNews', 'Himalayas', 'Jobicy', 'TheMuse', 'DOU',
  'LinkedIn', 'Greenhouse',
];

@Injectable()
export class ScraperConfigService {
  constructor(
    @InjectRepository(ScraperConfig)
    private readonly repo: Repository<ScraperConfig>,
  ) {}

  async get(userId: number): Promise<ScraperConfig> {
    let config = await this.repo.findOne({ where: { userId } });
    if (!config) {
      config = await this.seedForUser(userId);
    }
    return config;
  }

  async update(dto: UpdateScraperConfigDto, userId: number): Promise<ScraperConfig> {
    const config = await this.get(userId);
    await this.repo.update(config.id, dto);
    return this.repo.findOne({ where: { id: config.id } });
  }

  async seedForUser(userId: number): Promise<ScraperConfig> {
    let cfg: Record<string, any> = {};
    try {
      const filePath = join(process.cwd(), '../../config.json');
      cfg = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      // use defaults
    }
    return this.repo.save(this.repo.create({
      userId,
      searchTerms: cfg.searchTerms ?? [],
      minSalary: cfg.minSalary ?? 0,
      remoteOnly: cfg.remoteOnly ?? true,
      strongKeywords: cfg.strongKeywords ?? [],
      additionalKeywords: cfg.additionalKeywords ?? [],
      excludeTitle: cfg.excludeTitle ?? [],
      excludeKeywords: cfg.excludeKeywords ?? [],
      requireStrongMatch: cfg.requireStrongMatch ?? true,
      minScore: cfg.minScore ?? 2,
      enabledSources: ALL_SOURCES,
    }));
  }
}
