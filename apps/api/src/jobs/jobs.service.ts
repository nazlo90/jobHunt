import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as cheerio from 'cheerio';
import Groq from 'groq-sdk';
import { jsonrepair } from 'jsonrepair';
import { Job } from '../database/entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';

const SOURCE_PATTERNS: [RegExp, string][] = [
  [/linkedin\.com/, 'linkedin'],
  [/djinni\.co/, 'djinni'],
  [/remoteok\.com/, 'remoteok'],
  [/wellfound\.com/, 'wellfound'],
  [/remotive\.com/, 'remotive'],
  [/weworkremotely\.com/, 'weworkremotely'],
  [/greenhouse\.io/, 'greenhouse'],
  [/lever\.co/, 'lever'],
  [/workable\.com/, 'workable'],
];

const ORDER_MAP: Record<string, [string, 'ASC' | 'DESC']> = {
  created_at:   ['job.createdAt', 'DESC'],
  priority:     ['job.priority',  'DESC'],
  company:      ['job.company',   'ASC'],
  applied_date: ['job.appliedDate', 'DESC'],
  salary:       ['job.salaryRaw', 'DESC'],
};

@Injectable()
export class JobsService {
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  async findAll(query: QueryJobsDto): Promise<{ jobs: Job[]; total: number }> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 25;
    const skip  = (page - 1) * limit;

    const qb = this.jobsRepo.createQueryBuilder('job');

    if (query.search) {
      qb.where(
        '(job.company LIKE :s OR job.role LIKE :s OR job.techStack LIKE :s OR job.notes LIKE :s OR job.descriptionPreview LIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    if (query.status && query.status !== 'all') {
      qb.andWhere('job.status = :status', { status: query.status });
    }

    if (query.source && query.source !== 'all') {
      qb.andWhere('job.source = :source', { source: query.source });
    }

    if (query.minPriority && query.minPriority > 1) {
      qb.andWhere('job.priority >= :minPriority', { minPriority: query.minPriority });
    }

    const [col, dir] = ORDER_MAP[query.sortBy ?? 'created_at'] ?? ORDER_MAP['created_at'];
    qb.orderBy(col, dir).skip(skip).take(limit);

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total };
  }

  async getStats() {
    const total = await this.jobsRepo.count();
    const pipeline = await this.jobsRepo
      .createQueryBuilder('job')
      .where("job.status NOT IN ('New', 'Saved', 'Archived', 'Rejected')")
      .getCount();
    const offers   = await this.jobsRepo.count({ where: { status: 'Offer' } });
    const thisWeek = await this.jobsRepo
      .createQueryBuilder('job')
      .where("job.appliedDate >= date('now', '-7 days')")
      .getCount();

    const byStatus = await this.jobsRepo
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .getRawMany();

    const bySource = await this.jobsRepo
      .createQueryBuilder('job')
      .select('job.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.source')
      .getRawMany();

    return { total, pipeline, offers, thisWeek, byStatus, bySource };
  }

  async findOne(id: number): Promise<Job> {
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job #${id} not found`);
    return job;
  }

  async create(dto: CreateJobDto): Promise<Job> {
    const job = this.jobsRepo.create({
      company:     dto.company,
      role:        dto.role,
      salary:      dto.salary      ?? '',
      salaryRaw:   dto.salaryRaw   ?? 0,
      url:         dto.url         ?? '',
      location:    dto.location    ?? '',
      techStack:   dto.techStack   ?? '',
      status:      dto.status      ?? 'Saved',
      priority:    dto.priority    ?? 3,
      appliedDate: dto.appliedDate ?? '',
      contact:     dto.contact     ?? '',
      notes:       dto.notes       ?? '',
      source:      dto.source      ?? 'manual',
    });
    return this.jobsRepo.save(job);
  }

  async update(id: number, dto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);
    Object.assign(job, dto);
    return this.jobsRepo.save(job);
  }

  async remove(id: number): Promise<void> {
    const job = await this.findOne(id);
    await this.jobsRepo.remove(job);
  }

  async autocomplete(url: string): Promise<Partial<CreateJobDto>> {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    const html = await response.text();

    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .cookie-banner, [aria-hidden="true"]').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000);

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a job posting parser. Extract structured data from job posting text and return only valid JSON.',
        },
        {
          role: 'user',
          content: `Extract job details from this page and return a JSON object with these exact fields:
- company: company name (string)
- role: job title (string)
- salary: salary range if mentioned, empty string if not (string)
- location: job location, prefer "Remote" if remote (string)
- techStack: comma-separated list of technologies and skills (string)
- notes: 2-3 sentence summary of key requirements and responsibilities (string)

URL: ${url}
Page text:
${text}

Return ONLY a JSON object, no markdown, no explanation.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    try {
      const parsed = JSON.parse(jsonrepair(raw));
      return { ...parsed, source: this.guessSource(url), url };
    } catch {
      return { url, source: this.guessSource(url) };
    }
  }

  private guessSource(url: string): string {
    for (const [pattern, source] of SOURCE_PATTERNS) {
      if (pattern.test(url)) return source;
    }
    return 'manual';
  }
}
