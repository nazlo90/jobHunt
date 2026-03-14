import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../database/entities/job.entity';

export interface ScrapedJob {
  scrapeId: string;
  company: string;
  role: string;
  salary?: string;
  salaryRaw?: number;
  url?: string;
  location?: string;
  techStack?: string;
  source: string;
  descriptionPreview?: string;
}

export interface ScraperRun {
  startedAt: Date;
  finishedAt?: Date;
  total: number;
  inserted: number;
  errors: string[];
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private lastRun: ScraperRun | null = null;
  private running = false;

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  getStatus() {
    return {
      running: this.running,
      lastRun: this.lastRun,
    };
  }

  async run(): Promise<ScraperRun> {
    if (this.running) {
      return { ...this.lastRun!, startedAt: this.lastRun!.startedAt };
    }

    this.running = true;
    const run: ScraperRun = {
      startedAt: new Date(),
      total: 0,
      inserted: 0,
      errors: [],
    };
    this.lastRun = run;

    this.logger.log('Scraper started');

    try {
      // Dynamically import scrapers from original src/ (JS modules)
      // This bridges the old scrapers into the new NestJS service
      const scrapers = await import('../../../../src/scrapers/index.js' as any);
      const config = await import('../../../../src/scrapers/utils.js' as any);
      const { CONFIG } = config;

      const allJobs: ScrapedJob[] = [];

      const runners = [
        { name: 'Djinni', fn: () => scrapers.scrapeDjinni() },
        { name: 'RemoteOK', fn: () => scrapers.scrapeRemoteOK() },
        { name: 'Wellfound', fn: () => scrapers.scrapeWellfound() },
        { name: 'Remotive', fn: () => scrapers.scrapeRemotive() },
        { name: 'WeWorkRemotely', fn: () => scrapers.scrapeWWR() },
        { name: 'HackerNews', fn: () => scrapers.scrapeHN() },
        { name: 'Himalayas', fn: () => scrapers.scrapeHimalayas() },
        { name: 'Jobicy', fn: () => scrapers.scrapeJobicy() },
        { name: 'TheMuse', fn: () => scrapers.scrapeTheMuse() },
        { name: 'DOU', fn: () => scrapers.scrapeDOU() },
      ];

      for (const runner of runners) {
        try {
          const jobs = await runner.fn();
          this.logger.log(`${runner.name}: ${jobs.length} jobs`);
          allJobs.push(...jobs);
        } catch (err) {
          run.errors.push(`${runner.name}: ${err.message}`);
          this.logger.error(`${runner.name} failed: ${err.message}`);
        }
      }

      for (const term of CONFIG.searchTerms) {
        try {
          const jobs = await scrapers.scrapeLinkedIn(term);
          this.logger.log(`LinkedIn "${term}": ${jobs.length} jobs`);
          allJobs.push(...jobs);
        } catch (err) {
          run.errors.push(`LinkedIn(${term}): ${err.message}`);
        }
      }

      const greenhouseCompanies = ['stripe', 'airbnb', 'notion', 'figma', 'coinbase', 'discord', 'openai', 'shopify'];
      for (const company of greenhouseCompanies) {
        try {
          const jobs = await scrapers.scrapeGreenhouse(company);
          this.logger.log(`Greenhouse ${company}: ${jobs.length} jobs`);
          allJobs.push(...jobs);
        } catch (err) {
          run.errors.push(`Greenhouse(${company}): ${err.message}`);
        }
      }

      run.total = allJobs.length;

      for (const scraped of allJobs) {
        const existing = await this.jobsRepo.findOne({ where: { scrapeId: scraped.scrapeId } });
        if (!existing) {
          await this.jobsRepo.save(this.jobsRepo.create({
            scrapeId: scraped.scrapeId,
            company: scraped.company,
            role: scraped.role,
            salary: scraped.salary ?? '',
            salaryRaw: scraped.salaryRaw ?? 0,
            url: scraped.url ?? '',
            location: scraped.location ?? '',
            techStack: scraped.techStack ?? '',
            source: scraped.source,
            descriptionPreview: scraped.descriptionPreview ?? '',
            status: 'Bookmarked',
            priority: 3,
          }));
          run.inserted++;
        }
      }

      run.finishedAt = new Date();
      this.logger.log(`Scraper done: ${run.inserted} new jobs from ${run.total} scraped`);
    } catch (err) {
      run.errors.push(`Fatal: ${err.message}`);
      this.logger.error(`Scraper fatal error: ${err.message}`);
    } finally {
      this.running = false;
    }

    return run;
  }
}
