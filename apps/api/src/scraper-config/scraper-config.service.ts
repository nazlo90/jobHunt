import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScraperConfig } from './scraper-config.entity';
import { UpdateScraperConfigDto } from './update-scraper-config.dto';
import { readFileSync } from 'fs';
import { join } from 'path';

const CONFIG_ID = 1;

export const ALL_SOURCES = [
  'Djinni', 'RemoteOK', 'Wellfound', 'Remotive', 'WeWorkRemotely',
  'HackerNews', 'Himalayas', 'Jobicy', 'TheMuse', 'DOU',
  'LinkedIn', 'Greenhouse',
];

@Injectable()
export class ScraperConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(ScraperConfig)
    private readonly repo: Repository<ScraperConfig>,
  ) {}

  async onModuleInit() {
    const existing = await this.repo.findOne({ where: { id: CONFIG_ID } });
    if (!existing) {
      await this.seedFromFile();
    }
  }

  async get(): Promise<ScraperConfig> {
    return this.repo.findOne({ where: { id: CONFIG_ID } });
  }

  async update(dto: UpdateScraperConfigDto): Promise<ScraperConfig> {
    await this.repo.update(CONFIG_ID, dto);
    return this.get();
  }

  private async seedFromFile() {
    try {
      const filePath = join(process.cwd(), '../../config.json');
      const raw = readFileSync(filePath, 'utf8');
      const cfg = JSON.parse(raw);
      await this.repo.save(this.repo.create({
        id: CONFIG_ID,
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
    } catch {
      await this.repo.save(this.repo.create({
        id: CONFIG_ID,
        searchTerms: [],
        minSalary: 0,
        remoteOnly: true,
        strongKeywords: [],
        additionalKeywords: [],
        excludeTitle: [],
        excludeKeywords: [],
        requireStrongMatch: true,
        minScore: 2,
        enabledSources: ALL_SOURCES,
      }));
    }
  }
}
