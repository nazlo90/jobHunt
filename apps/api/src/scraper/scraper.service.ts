import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Job } from '../database/entities/job.entity';
import { ScraperProfileService } from '../scraper-profile/scraper-profile.service';

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

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    private readonly configService: ScraperProfileService,
  ) {}

  getStatus() {
    return { running: this.running, lastRun: this.lastRun };
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
      const scrapers = await import(`${scrapersBase}/index.js` as any);
      const utils    = await import(`${scrapersBase}/utils.js` as any);
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

      const allJobs: ScrapedJob[] = [];
      const enabled: string[] = profile.enabledSources ?? [];
      const isEnabled = (name: string) => enabled.length === 0 || enabled.includes(name);

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
      ];

      for (const runner of runners) {
        if (this.stopRequested) { this.logger.log('Scraper stopped by user'); break; }
        if (!isEnabled(runner.name)) {
          this.logger.log(`${runner.name}: skipped (disabled)`);
          continue;
        }
        try {
          const jobs = await runner.fn();
          this.logger.log(`${runner.name}: ${jobs.length} jobs`);
          allJobs.push(...jobs);
        } catch (err) {
          run.errors.push(`${runner.name}: ${err.message}`);
          this.logger.error(`${runner.name} failed: ${err.message}`);
        }
      }

      if (!this.stopRequested && isEnabled('LinkedIn')) {
        for (const term of profile.searchTerms) {
          if (this.stopRequested) { this.logger.log('Scraper stopped by user'); break; }
          try {
            const jobs = await scrapers.scrapeLinkedIn(term);
            this.logger.log(`LinkedIn "${term}": ${jobs.length} jobs`);
            allJobs.push(...jobs);
          } catch (err) {
            run.errors.push(`LinkedIn(${term}): ${err.message}`);
          }
        }
      }

      if (!this.stopRequested && isEnabled('Greenhouse')) {
        const greenhouseCompanies: string[] = profile.sourceConfig?.greenhouseCompanies ?? [];
        for (const company of greenhouseCompanies) {
          if (this.stopRequested) { this.logger.log('Scraper stopped by user'); break; }
          try {
            const jobs = await scrapers.scrapeGreenhouse(company);
            this.logger.log(`Greenhouse ${company}: ${jobs.length} jobs`);
            allJobs.push(...jobs);
          } catch (err) {
            run.errors.push(`Greenhouse(${company}): ${err.message}`);
          }
        }
      }

      run.total = allJobs.length;
      await this.upsertJobs(allJobs, run, userId);

      run.finishedAt = new Date();
      this.logger.log(`Scraper done: ${run.inserted} new, ${run.updated} updated from ${run.total} scraped`);
    } catch (err) {
      run.errors.push(`Fatal: ${err.message}`);
      this.logger.error(`Scraper fatal error: ${err.message}`);
    } finally {
      this.running = false;
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

  private async upsertJobs(rawJobs: ScrapedJob[], run: ScraperRun, userId?: number): Promise<void> {
    if (rawJobs.length === 0) return;

    // Deduplicate within the current scrape batch — keep first occurrence per scrapeId
    const seen = new Set<string>();
    const allJobs = rawJobs.filter((j) => {
      if (seen.has(j.scrapeId)) return false;
      seen.add(j.scrapeId);
      return true;
    });
    this.logger.log(`Deduped batch: ${rawJobs.length} → ${allJobs.length} unique jobs`);

    const scrapeIds = allJobs.map((j) => j.scrapeId);

    const archiveQb = this.jobsRepo
      .createQueryBuilder()
      .update(Job)
      .set({ status: 'Archived' as any })
      .where('status = :status AND scrape_id NOT IN (:...ids)', { status: 'New', ids: scrapeIds });
    if (userId != null) {
      archiveQb.andWhere('user_id = :userId', { userId });
    }
    const archiveResult = await archiveQb.execute();
    run.deleted = archiveResult.affected ?? 0;
    this.logger.log(`Archived ${run.deleted} stale New jobs`);

    // Batch load all existing jobs in one query instead of N findOne calls
    const existingQb = this.jobsRepo
      .createQueryBuilder('job')
      .where('job.scrape_id IN (:...ids)', { ids: scrapeIds });
    if (userId != null) {
      existingQb.andWhere('job.user_id = :userId', { userId });
    }
    const existingJobs = await existingQb.getMany();
    const existingMap  = new Map(existingJobs.map((j) => [j.scrapeId, j]));

    // Secondary dedup by company+role — catches cases where scrapeId drifts between runs
    const norm = (s: string) => s.trim().toLowerCase();
    const jobsWithoutScrapeMatch = allJobs.filter((j) => !existingMap.has(j.scrapeId));
    const companyRoleExists = new Set<string>();
    if (jobsWithoutScrapeMatch.length > 0) {
      const companies = [...new Set(jobsWithoutScrapeMatch.map((j) => norm(j.company)))];
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

    for (const scraped of allJobs) {
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
        // Refresh scraped fields for jobs not yet acted on
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
