import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ScraperProfile } from './scraper-profile.entity';
import { CreateScraperProfileDto } from './create-scraper-profile.dto';
import { UpdateScraperProfileDto } from './update-scraper-profile.dto';

export const ALL_SOURCES = [
  'Djinni', 'RemoteOK', 'Wellfound', 'Remotive', 'WeWorkRemotely',
  'HackerNews', 'Himalayas', 'Jobicy', 'TheMuse', 'DOU',
  'LinkedIn', 'Greenhouse',
];

@Injectable()
export class ScraperProfileService implements OnModuleInit {
  constructor(
    @InjectRepository(ScraperProfile)
    private readonly repo: Repository<ScraperProfile>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      await this.seedFromFile();
    }
  }

  async list(): Promise<ScraperProfile[]> {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  async getActive(): Promise<ScraperProfile> {
    const active = await this.repo.findOne({ where: { isActive: true } });
    if (active) return active;
    // Fallback: first profile
    const first = await this.repo.findOne({ order: { id: 'ASC' } });
    if (!first) throw new NotFoundException('No scraper profiles found');
    return first;
  }

  async getById(id: number): Promise<ScraperProfile> {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);
    return profile;
  }

  async create(dto: CreateScraperProfileDto): Promise<ScraperProfile> {
    const count = await this.repo.count();
    const profile = this.repo.create({
      name: dto.name,
      isActive: count === 0,
      searchTerms: dto.searchTerms ?? [],
      minSalary: dto.minSalary ?? 0,
      remoteOnly: dto.remoteOnly ?? true,
      strongKeywords: dto.strongKeywords ?? [],
      additionalKeywords: dto.additionalKeywords ?? [],
      excludeTitle: dto.excludeTitle ?? [],
      excludeKeywords: dto.excludeKeywords ?? [],
      requireStrongMatch: dto.requireStrongMatch ?? true,
      minScore: dto.minScore ?? 2,
      enabledSources: dto.enabledSources ?? ALL_SOURCES,
    });
    return this.repo.save(profile);
  }

  async update(id: number, dto: UpdateScraperProfileDto): Promise<ScraperProfile> {
    await this.getById(id);
    await this.repo.update(id, dto);
    return this.getById(id);
  }

  async activate(id: number): Promise<ScraperProfile> {
    await this.getById(id);
    await this.repo.createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('1=1')
      .execute();
    await this.repo.update(id, { isActive: true });
    return this.getById(id);
  }

  async duplicate(id: number, name: string): Promise<ScraperProfile> {
    const source = await this.getById(id);
    const { id: _, isActive, createdAt, updatedAt, ...data } = source;
    return this.repo.save(this.repo.create({ ...data, name, isActive: false }));
  }

  async delete(id: number): Promise<void> {
    const profile = await this.getById(id);
    if (profile.isActive) {
      throw new BadRequestException('Cannot delete the active profile. Activate another profile first.');
    }
    const count = await this.repo.count();
    if (count <= 1) {
      throw new BadRequestException('Cannot delete the last remaining profile.');
    }
    await this.repo.delete(id);
  }

  private async seedFromFile() {
    let cfg: Record<string, any> = {};
    try {
      const filePath = join(process.cwd(), '../../config.json');
      cfg = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      // use defaults
    }
    await this.repo.save(this.repo.create({
      name: 'Default',
      isActive: true,
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
