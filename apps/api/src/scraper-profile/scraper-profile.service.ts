import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Groq from 'groq-sdk';
import { jsonrepair } from 'jsonrepair';
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
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

  async extractFromCv(cvText: string, userId: number): Promise<{ profile: ScraperProfile; wasUpdated: boolean }> {
    const activeProfile = await this.getActive(userId);

    if (activeProfile.searchTerms.length > 0) {
      return { profile: activeProfile, wasUpdated: false };
    }

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Analyze this CV and extract job search configuration. Return ONLY valid JSON with no markdown, no explanation.

CV (first 6000 chars):
${cvText.slice(0, 6000)}

Return JSON with exactly these keys:
{
  "searchTerms": ["3-6 job title search queries matching this person's seniority and primary stack, e.g. 'Senior Angular Developer'"],
  "strongKeywords": ["5-12 primary technical skills from the CV, lowercase"],
  "additionalKeywords": ["5-10 secondary or seniority keywords like 'senior', 'lead', 'rxjs', lowercase"],
  "excludeTitle": ["job title patterns clearly unrelated to this profile, lowercase, e.g. 'junior', 'backend engineer', 'data scientist'"],
  "excludeKeywords": ["technology stack keywords to exclude from job descriptions, lowercase, e.g. 'java', 'python', 'wordpress'"]
}`,
      }],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty AI response');

    const extracted = JSON.parse(jsonrepair(raw)) as {
      searchTerms: string[];
      strongKeywords: string[];
      additionalKeywords: string[];
      excludeTitle: string[];
      excludeKeywords: string[];
    };

    const updated = await this.update(activeProfile.id, {
      searchTerms: extracted.searchTerms ?? [],
      strongKeywords: extracted.strongKeywords ?? [],
      additionalKeywords: extracted.additionalKeywords ?? [],
      excludeTitle: extracted.excludeTitle ?? [],
      excludeKeywords: extracted.excludeKeywords ?? [],
    }, userId);

    return { profile: updated, wasUpdated: true };
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
