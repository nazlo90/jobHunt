import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScraperProfile } from './scraper-profile.entity';
import { CreateScraperProfileDto } from './create-scraper-profile.dto';
import { UpdateScraperProfileDto } from './update-scraper-profile.dto';

export const ALL_SOURCES = [
  'Djinni', 'RemoteOK', 'Wellfound', 'Remotive', 'WeWorkRemotely',
  'HackerNews', 'Himalayas', 'Jobicy', 'TheMuse', 'DOU',
  'LinkedIn', 'Greenhouse',
];

@Injectable()
export class ScraperProfileService {
  constructor(
    @InjectRepository(ScraperProfile)
    private readonly repo: Repository<ScraperProfile>,
  ) {}

  async list(userId: number): Promise<ScraperProfile[]> {
    const profiles = await this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
    if (profiles.length === 0) {
      const seeded = await this.seedForUser(userId);
      return [seeded];
    }
    return profiles;
  }

  async getActive(userId?: number): Promise<ScraperProfile> {
    const where: Record<string, any> = { isActive: true };
    if (userId != null) where.userId = userId;
    const active = await this.repo.findOne({ where });
    if (active) return active;
    // Fallback: first profile for this user
    const firstWhere: Record<string, any> = {};
    if (userId != null) firstWhere.userId = userId;
    const first = await this.repo.findOne({ where: firstWhere, order: { id: 'ASC' } });
    if (first) return first;
    // No profiles yet — seed a default one (only if userId known)
    if (userId != null) return this.seedForUser(userId);
    throw new NotFoundException('No scraper profiles found');
  }

  async getById(id: number, userId?: number): Promise<ScraperProfile> {
    const where: Record<string, any> = { id };
    if (userId != null) where.userId = userId;
    const profile = await this.repo.findOne({ where });
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);
    return profile;
  }

  async create(dto: CreateScraperProfileDto, userId: number): Promise<ScraperProfile> {
    const count = await this.repo.count({ where: { userId } });
    const profile = this.repo.create({
      userId,
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

  async update(id: number, dto: UpdateScraperProfileDto, userId: number): Promise<ScraperProfile> {
    await this.getById(id, userId);
    await this.repo.update(id, dto);
    return this.getById(id, userId);
  }

  async activate(id: number, userId: number): Promise<ScraperProfile> {
    await this.getById(id, userId);
    await this.repo.createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('user_id = :userId', { userId })
      .execute();
    await this.repo.update(id, { isActive: true });
    return this.getById(id, userId);
  }

  async duplicate(id: number, name: string, userId: number): Promise<ScraperProfile> {
    const source = await this.getById(id, userId);
    const { id: _, isActive, createdAt, updatedAt, ...data } = source;
    return this.repo.save(this.repo.create({ ...data, name, isActive: false, userId }));
  }

  async delete(id: number, userId: number): Promise<void> {
    const profile = await this.getById(id, userId);
    if (profile.isActive) {
      throw new BadRequestException('Cannot delete the active profile. Activate another profile first.');
    }
    const count = await this.repo.count({ where: { userId } });
    if (count <= 1) {
      throw new BadRequestException('Cannot delete the last remaining profile.');
    }
    await this.repo.delete(id);
  }

  async seedForUser(userId: number): Promise<ScraperProfile> {
    return this.repo.save(this.repo.create({
      userId,
      name: 'Default',
      isActive: true,
      searchTerms: [],
      minSalary: 0,
      remoteOnly: true,
      strongKeywords: [],
      additionalKeywords: [],
      excludeTitle: [],
      excludeKeywords: [],
      requireStrongMatch: false,
      minScore: 2,
      enabledSources: ALL_SOURCES,
    }));
  }

  /** Returns all distinct userIds that have at least one profile. Used by the scheduler. */
  async getAllUserIds(): Promise<number[]> {
    const rows: Array<{ userId: number }> = await this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.user_id', 'userId')
      .where('p.user_id IS NOT NULL')
      .getRawMany();
    return rows.map(r => Number(r.userId));
  }
}
