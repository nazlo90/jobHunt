import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Job } from '../database/entities/job.entity';
import { ScraperProfileService } from '../scraper-profile/scraper-profile.service';

const esmImport = new Function('path', 'return import(path)') as (path: string) => Promise<any>;

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
  score?: number;
}

export interface ScraperRun {
  startedAt: Date;
  finishedAt?: Date;
  total: number;
  inserted: number;
  updated: number;
  deleted: number;
  errors: string[];
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private lastRun: ScraperRun | null = null;
  private running = false;
  private stopRequested = false;
  private currentPlatform: string | null = null;
  private platformResults: { name: string; count: number }[] = [];

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    private readonly configService: ScraperProfileService,
  ) {}

  getStatus() {
    return {
      running: this.running,
      lastRun: this.lastRun,
      currentPlatform: this.currentPlatform,
      platformResults: this.platformResults,
    };
  }

  stop() {
    if (this.running) this.stopRequested = true;
  }

  async runForAllUsers(): Promise<void> {
    const userIds = await this.configService.getAllUserIds();
    for (const userId of userIds) {
      await this.run(undefined, userId);
    }
  }

  async run(profileId?: number, userId?: number): Promise<ScraperRun> {
    if (this.running) {
      return { ...this.lastRun!, startedAt: this.lastRun!.startedAt };
    }

    this.running = true;
    this.stopRequested = false;
    this.currentPlatform = null;
    this.platformResults = [];
    const run: ScraperRun = {
      startedAt: new Date(),
      total: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };
    this.lastRun = run;
    this.logger.log('Scraper started');

    try {
      // Dev:  __dirname = apps/api/src/scraper/ → ../../../../src/scrapers/
      // Prod: __dirname = /app/dist/scraper/   → ../../scrapers/
      const scrapersBase = process.env.SCRAPERS_PATH
        ?? path.resolve(__dirname, '../../../../src/scrapers');
      const scrapers = await esmImport(`${scrapersBase}/index.js`);
      const utils    = await esmImport(`${scrapersBase}/utils.js`);
      const profile  = profileId
        ? await this.configService.getById(profileId, userId)
        : await this.configService.getActive(userId);
      this.logger.log(`Using profile: "${profile.name}" (id=${profile.id})`);

      // Pass only scraper-relevant fields so module-level CONFIG stays clean
      utils.setConfig({
        searchTerms:        profile.searchTerms,
        minSalary:          profile.minSalary,
        remoteOnly:         profile.remoteOnly,
        strongKeywords:     profile.strongKeywords,
        additionalKeywords: profile.additionalKeywords,
        excludeTitle:       profile.excludeTitle,
        excludeKeywords:    profile.excludeKeywords,
        requireStrongMatch: profile.requireStrongMatch,
        minScore:           profile.minScore,
        sourceConfig:       profile.sourceConfig ?? {},
      });

      const allScrapeIds: string[] = [];
      const enabled: string[] = profile.enabledSources ?? [];
      const isEnabled = (name: string) => enabled.length === 0 || enabled.includes(name);

      const PLATFORM_TIMEOUT_MS = 30_000;
      const runPlatform = async (label: string, fn: () => Promise<ScrapedJob[]>) => {
        if (this.stopRequested) { this.logger.log('Scraper stopped by user'); return; }
        this.currentPlatform = label;
        try {
          const timeout = new Promise<ScrapedJob[]>((_, reject) =>
            setTimeout(() => reject(new Error(`timed out after ${PLATFORM_TIMEOUT_MS / 1000}s`)), PLATFORM_TIMEOUT_MS),
          );
          const jobs = await Promise.race([fn(), timeout]);
          this.logger.log(`${label}: ${jobs.length} jobs`);
          run.total += jobs.length;
          await this.insertOrUpdateBatch(jobs, run, userId);
          allScrapeIds.push(...jobs.map((j) => j.scrapeId));
          this.platformResults.push({ name: label, count: jobs.length });
        } catch (err) {
          run.errors.push(`${label}: ${err.message}`);
          this.logger.error(`${label} failed: ${err.message}`);
          this.platformResults.push({ name: label, count: 0 });
        }
      };

      const runners = [
        { name: 'Djinni',         fn: () => scrapers.scrapeDjinni() },
        { name: 'RemoteOK',       fn: () => scrapers.scrapeRemoteOK() },
        { name: 'Wellfound',      fn: () => scrapers.scrapeWellfound() },
        { name: 'Remotive',       fn: () => scrapers.scrapeRemotive() },
        { name: 'WeWorkRemotely', fn: () => scrapers.scrapeWWR() },
        { name: 'HackerNews',     fn: () => scrapers.scrapeHN() },
        { name: 'Himalayas',      fn: () => scrapers.scrapeHimalayas() },
        { name: 'Jobicy',         fn: () => scrapers.scrapeJobicy() },
        { name: 'TheMuse',        fn: () => scrapers.scrapeTheMuse() },
        { name: 'DOU',            fn: () => scrapers.scrapeDOU() },
        { name: 'JustJoin',       fn: () => scrapers.scrapeJustJoin() },
        { name: 'NoFluffJobs',    fn: () => scrapers.scrapeNoFluffJobs() },
        { name: 'HappyMonday',    fn: () => scrapers.scrapeHappyMonday() },
        { name: 'JobGether',      fn: () => scrapers.scrapeJobGether() },
        { name: 'TotalJobs',      fn: () => scrapers.scrapeTotalJobs() },
        { name: 'Jooble',         fn: () => scrapers.scrapeJooble() },
        { name: 'Indeed',         fn: () => scrapers.scrapeIndeed() },
        { name: 'Glassdoor',      fn: () => scrapers.scrapeGlassdoor() },
        { name: 'Kariyer',        fn: () => scrapers.scrapeKariyer() },
      ];

      for (const runner of runners) {
        if (!isEnabled(runner.name)) {
          this.logger.log(`${runner.name}: skipped (disabled)`);
          continue;
        }
        await runPlatform(runner.name, runner.fn);
      }

      if (isEnabled('LinkedIn')) {
        for (const term of profile.searchTerms) {
          await runPlatform(`LinkedIn (${term})`, () => scrapers.scrapeLinkedIn(term));
        }
      }

      if (isEnabled('Greenhouse')) {
        const greenhouseCompanies: string[] = profile.sourceConfig?.greenhouseCompanies ?? [];
        for (const company of greenhouseCompanies) {
          await runPlatform(`Greenhouse (${company})`, () => scrapers.scrapeGreenhouse(company));
        }
      }

      // Archive stale jobs once all platforms are done
      if (!this.stopRequested && allScrapeIds.length > 0) {
        await this.archiveStaleJobs(allScrapeIds, run, userId);
      }

      run.finishedAt = new Date();
      this.logger.log(`Scraper done: ${run.inserted} new, ${run.updated} updated from ${run.total} scraped`);
    } catch (err) {
      run.errors.push(`Fatal: ${err.message}`);
      this.logger.error(`Scraper fatal error: ${err.message}`);
    } finally {
      this.running = false;
      this.currentPlatform = null;
    }

    return run;
  }

  private rawScoreToPriority(score: number): number {
    if (score <= 0) return 1;
    if (score <= 2) return 2;
    if (score <= 4) return 3;
    if (score <= 6) return 4;
    return 5;
  }

  private async archiveStaleJobs(allScrapeIds: string[], run: ScraperRun, userId?: number): Promise<void> {
    const uniqueIds = [...new Set(allScrapeIds)];
    const archiveQb = this.jobsRepo
      .createQueryBuilder()
      .update(Job)
      .set({ status: 'Archived' as any })
      .where('status = :status AND scrape_id NOT IN (:...ids)', { status: 'New', ids: uniqueIds });
    if (userId != null) {
      archiveQb.andWhere('user_id = :userId', { userId });
    }
    const archiveResult = await archiveQb.execute();
    run.deleted = archiveResult.affected ?? 0;
    this.logger.log(`Archived ${run.deleted} stale New jobs`);
  }

  private async insertOrUpdateBatch(rawJobs: ScrapedJob[], run: ScraperRun, userId?: number): Promise<void> {
    if (rawJobs.length === 0) return;

    // Deduplicate within this platform batch — keep first occurrence per scrapeId
    const seen = new Set<string>();
    const jobs = rawJobs.filter((j) => {
      if (seen.has(j.scrapeId)) return false;
      seen.add(j.scrapeId);
      return true;
    });

    const scrapeIds = jobs.map((j) => j.scrapeId);

    // Batch load existing jobs
    const existingQb = this.jobsRepo
      .createQueryBuilder('job')
      .where('job.scrape_id IN (:...ids)', { ids: scrapeIds });
    if (userId != null) {
      existingQb.andWhere('job.user_id = :userId', { userId });
    }
    const existingJobs = await existingQb.getMany();
    const existingMap  = new Map(existingJobs.map((j) => [j.scrapeId, j]));

    // Secondary dedup by company+role
    const norm = (s: string) => s.trim().toLowerCase();
    const newJobs = jobs.filter((j) => !existingMap.has(j.scrapeId));
    const companyRoleExists = new Set<string>();
    if (newJobs.length > 0) {
      const companies = [...new Set(newJobs.map((j) => norm(j.company)))];
      const dedupQb = this.jobsRepo
        .createQueryBuilder('job')
        .select(['job.company', 'job.role'])
        .where('LOWER(TRIM(job.company)) IN (:...companies) AND job.status = :status', { companies, status: 'New' });
      if (userId != null) {
        dedupQb.andWhere('job.user_id = :userId', { userId });
      }
      const existing = await dedupQb.getMany();
      for (const j of existing) {
        companyRoleExists.add(`${norm(j.company)}|${norm(j.role)}`);
      }
    }

    for (const scraped of jobs) {
      const existing = existingMap.get(scraped.scrapeId);

      if (!existing) {
        const key = `${norm(scraped.company)}|${norm(scraped.role)}`;
        if (companyRoleExists.has(key)) {
          this.logger.debug(`Skip duplicate (company+role): ${scraped.company} – ${scraped.role}`);
          continue;
        }
        try {
          await this.jobsRepo.save(this.jobsRepo.create({
            scrapeId:           scraped.scrapeId,
            company:            scraped.company,
            role:               scraped.role,
            salary:             scraped.salary      ?? '',
            salaryRaw:          scraped.salaryRaw   ?? 0,
            url:                scraped.url         ?? '',
            location:           scraped.location    ?? '',
            techStack:          scraped.techStack   ?? '',
            source:             scraped.source,
            descriptionPreview: scraped.descriptionPreview ?? '',
            status:             'New',
            priority:           this.rawScoreToPriority(scraped.score ?? 0),
            userId,
          }));
          run.inserted++;
        } catch (err: any) {
          if (err?.message?.includes('UNIQUE constraint failed')) {
            this.logger.debug(`Skip duplicate scrape_id (cross-user): ${scraped.scrapeId}`);
          } else {
            throw err;
          }
        }
      } else if (existing.status === 'New') {
        await this.jobsRepo.save({
          ...existing,
          company:            scraped.company,
          role:               scraped.role,
          salary:             scraped.salary             ?? existing.salary,
          salaryRaw:          scraped.salaryRaw          ?? existing.salaryRaw,
          url:                scraped.url                ?? existing.url,
          location:           scraped.location           ?? existing.location,
          techStack:          scraped.techStack          ?? existing.techStack,
          descriptionPreview: scraped.descriptionPreview ?? existing.descriptionPreview,
        });
        run.updated++;
      }
    }
  }
}
