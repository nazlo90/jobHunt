import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import Groq from 'groq-sdk';
import { jsonrepair } from 'jsonrepair';
import { AdaptedCv } from '../database/entities/adapted-cv.entity';
import { Job } from '../database/entities/job.entity';
import { UserCv } from '../database/entities/user-cv.entity';
import { GenerateCvDto } from './dto/generate-cv.dto';
import { MASTER_CV } from '../cv-adapter-data';

const MASTER_CV_PATH = path.join(__dirname, '..', 'master-cv.json');

@Injectable()
export class CvsService {
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  constructor(
    @InjectRepository(AdaptedCv)
    private readonly cvsRepo: Repository<AdaptedCv>,
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    @InjectRepository(UserCv)
    private readonly userCvsRepo: Repository<UserCv>,
  ) {}

  async getMasterCv(): Promise<object> {
    try {
      const raw = await fs.readFile(MASTER_CV_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return MASTER_CV;
    }
  }

  async saveMasterCv(data: object): Promise<void> {
    await fs.writeFile(MASTER_CV_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  private parseJsonFields(cv: AdaptedCv): AdaptedCv {
    const parse = (v: unknown): unknown[] => {
      if (!v) return [];
      try { return typeof v === 'string' ? JSON.parse(v) : (v as unknown[]); } catch { return []; }
    };
    return {
      ...cv,
      keywordsFound: parse(cv.keywordsFound) as any,
      missingSkills: parse(cv.missingSkills) as any,
      topExperience: parse(cv.topExperience) as any,
    };
  }

  async findForJob(jobId: number): Promise<AdaptedCv[]> {
    const cvs = await this.cvsRepo.find({ where: { jobId }, order: { createdAt: 'DESC' } });
    return cvs.map((cv) => this.parseJsonFields(cv));
  }

  async findRecent(): Promise<AdaptedCv[]> {
    const cvs = await this.cvsRepo.find({ order: { createdAt: 'DESC' }, take: 20 });
    return cvs.map((cv) => this.parseJsonFields(cv));
  }

  async generate(dto: GenerateCvDto): Promise<AdaptedCv> {
    const job = dto.jobId
      ? await this.jobsRepo.findOne({ where: { id: dto.jobId } })
      : null;

    let cvText = dto.cvText;
    if (!cvText && dto.userCvId) {
      const userCv = await this.userCvsRepo.findOne({ where: { id: dto.userCvId } });
      if (userCv) cvText = userCv.cvText;
    }

    const masterCv = dto.masterCv ?? await this.getMasterCv();
    const candidateInput = cvText
      ? `CANDIDATE CV (plain text extracted from PDF):\n${cvText}`
      : `CANDIDATE CV (JSON):\n${JSON.stringify(masterCv, null, 2)}`;

    const systemPrompt = `You are an expert technical CV writer and career coach specialising in software engineering roles.
Your task is to adapt a candidate's CV to maximally match a specific job description.

Rules:
- Be factual — only use information present in the candidate's CV. Do not invent experience or skills.
- Be specific — tailor language to mirror keywords from the job description where they genuinely apply.
- Be concise — profile max 4 sentences, each experience entry max 5 tailored bullets.
- Make MINIMAL changes to the CV — only adjust the profile summary and the most relevant bullet points to better reflect the job requirements. Keep all other content unchanged.
- adapted_cv_text must be a complete, ready-to-submit CV in clean plain text (no markdown fences), formatted as: Name, contact, profile, skills, experience (tailored bullets), education. Use dashes for bullets.
- cover_letter must be 3–4 paragraphs: opening hook, why you're a strong match, key achievements, closing call-to-action. Address "Dear Hiring Manager" if no name is known.
- Output ONLY valid JSON, no markdown fences, no extra text.`;

    const userPrompt = `JOB DESCRIPTION:
${dto.jobDescription}

${candidateInput}

Return a JSON object with exactly these fields:
{
  "relevance_score": <integer 0-100>,
  "keywords_found": <string[] — job keywords that appear in the CV>,
  "missing_skills": <string[] — required skills from JD not in CV>,
  "adapted_profile": <string — 3-4 sentence profile tailored to this role>,
  "top_experience": <array of { company, period, role, bullets: string[] } — most relevant jobs with tailored bullets>,
  "adapted_cv_text": <string — complete formatted CV ready to submit>,
  "cover_letter": <string — full 3-4 paragraph cover letter>,
  "advice": <string — 2-3 sentences of tactical application advice>
}`;

    let raw: string;
    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
      });
      raw = (completion.choices[0].message.content ?? '').trim()
        .replace(/^```json\s*/m, '')
        .replace(/\s*```$/m, '');
    } catch (err: any) {
      throw new HttpException(err?.message ?? 'Groq API error', HttpStatus.BAD_GATEWAY);
    }

    let result: Record<string, any>;
    try {
      result = JSON.parse(jsonrepair(raw));
    } catch {
      throw new HttpException('Failed to parse Groq response', HttpStatus.BAD_GATEWAY);
    }

    const cv = this.cvsRepo.create({
      jobId:          job?.id ?? null,
      company:        job?.company ?? dto.company ?? '',
      role:           job?.role    ?? dto.role    ?? '',
      relevanceScore: result.relevance_score,
      keywordsFound:  JSON.stringify(result.keywords_found ?? []),
      missingSkills:  JSON.stringify(result.missing_skills ?? []),
      adaptedProfile: result.adapted_profile,
      topExperience:  JSON.stringify(result.top_experience ?? []),
      adaptedCvText:  result.adapted_cv_text,
      coverLetter:    result.cover_letter,
      advice:         result.advice,
    });

    const saved = await this.cvsRepo.save(cv);
    return this.parseJsonFields(saved);
  }
}
