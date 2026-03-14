import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Job } from '../database/entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  async findAll(query: QueryJobsDto): Promise<Job[]> {
    const where: FindOptionsWhere<Job> = {};

    if (query.status && query.status !== 'all') {
      where.status = query.status as any;
    }
    if (query.source && query.source !== 'all') {
      where.source = query.source;
    }
    if (query.search) {
      // TypeORM doesn't support OR in where object directly — use QueryBuilder
      return this.jobsRepo.createQueryBuilder('job')
        .where(
          '(job.company LIKE :s OR job.role LIKE :s OR job.techStack LIKE :s OR job.notes LIKE :s)',
          { s: `%${query.search}%` },
        )
        .andWhere(query.status && query.status !== 'all' ? 'job.status = :status' : '1=1', { status: query.status })
        .andWhere(query.source && query.source !== 'all' ? 'job.source = :source' : '1=1', { source: query.source })
        .orderBy(this.orderClause(query.sortBy))
        .limit(500)
        .getMany();
    }

    const orderBy = this.orderMap(query.sortBy);
    return this.jobsRepo.find({ where, order: orderBy, take: 500 });
  }

  async getStats() {
    const total = await this.jobsRepo.count();
    const pipeline = await this.jobsRepo
      .createQueryBuilder('job')
      .where("job.status NOT IN ('Bookmarked', 'Rejected')")
      .getCount();
    const offers = await this.jobsRepo.count({ where: { status: 'Offer' } });
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
      company: dto.company,
      role: dto.role,
      salary: dto.salary ?? '',
      salaryRaw: dto.salaryRaw ?? 0,
      url: dto.url ?? '',
      location: dto.location ?? '',
      techStack: dto.techStack ?? '',
      status: dto.status ?? 'Bookmarked',
      priority: dto.priority ?? 3,
      appliedDate: dto.appliedDate ?? '',
      contact: dto.contact ?? '',
      notes: dto.notes ?? '',
      source: dto.source ?? 'manual',
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

  private orderClause(sortBy?: string): string {
    const map: Record<string, string> = {
      created_at: 'job.createdAt DESC',
      priority: 'job.priority DESC',
      company: 'job.company ASC',
      applied_date: 'job.appliedDate DESC',
      salary: 'job.salaryRaw DESC',
    };
    return map[sortBy ?? 'created_at'] ?? 'job.createdAt DESC';
  }

  private orderMap(sortBy?: string): Record<string, 'ASC' | 'DESC'> {
    const map: Record<string, Record<string, 'ASC' | 'DESC'>> = {
      created_at: { createdAt: 'DESC' },
      priority: { priority: 'DESC' },
      company: { company: 'ASC' },
      applied_date: { appliedDate: 'DESC' },
      salary: { salaryRaw: 'DESC' },
    };
    return map[sortBy ?? 'created_at'] ?? { createdAt: 'DESC' };
  }
}
