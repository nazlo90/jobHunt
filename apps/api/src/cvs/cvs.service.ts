import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { AdaptedCv } from '../database/entities/adapted-cv.entity';
import { Job } from '../database/entities/job.entity';
import { GenerateCvDto } from './dto/generate-cv.dto';

// Import your master CV data — keep this file outside NestJS src so it's easy to edit
import { MASTER_CV } from '../cv-adapter-data';

@Injectable()
export class CvsService {
  private readonly anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  constructor(
    @InjectRepository(AdaptedCv)
    private readonly cvsRepo: Repository<AdaptedCv>,
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  async findForJob(jobId: number): Promise<AdaptedCv[]> {
    return this.cvsRepo.find({
      where: { jobId },
      order: { createdAt: 'DESC' },
    });
  }

  async findRecent(): Promise<AdaptedCv[]> {
    return this.cvsRepo.find({ order: { createdAt: 'DESC' }, take: 20 });
  }

  async generate(dto: GenerateCvDto): Promise<AdaptedCv> {
    const job = dto.jobId
      ? await this.jobsRepo.findOne({ where: { id: dto.jobId } })
      : null;

    let message: Awaited<ReturnType<typeof this.anthropic.messages.create>>;
    try {
      message = await this.anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        system: 'You are a technical CV writer. Output ONLY valid JSON, no markdown fences.',
        messages: [
          {
            role: 'user',
            content: `Job: ${dto.jobDescription}\n\nCV: ${JSON.stringify(MASTER_CV)}\n\nReturn JSON: {relevance_score,keywords_found,missing_skills,adapted_profile,top_experience,cover_letter,advice}`,
          },
        ],
      });
    } catch (err: any) {
      const apiMessage = err?.error?.error?.message ?? err?.message ?? 'Anthropic API error';
      const status = err?.status === 400 && apiMessage.includes('credit') ? HttpStatus.PAYMENT_REQUIRED : HttpStatus.BAD_GATEWAY;
      throw new HttpException(apiMessage, status);
    }

    const raw = (message.content[0] as any).text
      .trim()
      .replace(/^```json\s*/m, '')
      .replace(/\s*```$/m, '');
    const result = JSON.parse(raw);

    const cv = this.cvsRepo.create({
      jobId: job?.id ?? null,
      company: job?.company ?? dto.company ?? '',
      role: job?.role ?? dto.role ?? '',
      relevanceScore: result.relevance_score,
      keywordsFound: JSON.stringify(result.keywords_found ?? []),
      missingSkills: JSON.stringify(result.missing_skills ?? []),
      adaptedProfile: result.adapted_profile,
      topExperience: JSON.stringify(result.top_experience ?? []),
      coverLetter: result.cover_letter,
      advice: result.advice,
    });

    return this.cvsRepo.save(cv);
  }
}
