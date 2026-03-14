import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import Groq from 'groq-sdk';
import { jsonrepair } from 'jsonrepair';
import { AdaptedCv } from '../database/entities/adapted-cv.entity';
import { Job } from '../database/entities/job.entity';
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
  ) {}

  getMasterCv(): object {
    if (fs.existsSync(MASTER_CV_PATH)) {
      return JSON.parse(fs.readFileSync(MASTER_CV_PATH, 'utf-8'));
    }
    return MASTER_CV;
  }

  saveMasterCv(data: object): void {
    fs.writeFileSync(MASTER_CV_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  private parseJsonFields(cv: AdaptedCv): AdaptedCv {
    const parse = (v: string | null): any => {
      if (!v) return [];
      try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return []; }
    };
    cv.keywordsFound = parse(cv.keywordsFound);
    cv.missingSkills = parse(cv.missingSkills);
    cv.topExperience = parse(cv.topExperience);
    return cv;
  }

  async findForJob(jobId: number): Promise<AdaptedCv[]> {
    const cvs = await this.cvsRepo.find({ where: { jobId }, order: { createdAt: 'DESC' } });
    return cvs.map(cv => this.parseJsonFields(cv));
  }

  async findRecent(): Promise<AdaptedCv[]> {
    const cvs = await this.cvsRepo.find({ order: { createdAt: 'DESC' }, take: 20 });
    return cvs.map(cv => this.parseJsonFields(cv));
  }

  async generate(dto: GenerateCvDto): Promise<AdaptedCv> {
    const job = dto.jobId
      ? await this.jobsRepo.findOne({ where: { id: dto.jobId } })
      : null;

    const masterCv = dto.masterCv ?? this.getMasterCv();

    const systemPrompt = `You are an expert technical CV writer and career coach specialising in software engineering roles.
Your task is to adapt a candidate's CV to maximally match a specific job description.

Rules:
- Be factual — only use information present in the candidate's CV. Do not invent experience or skills.
- Be specific — tailor language to mirror keywords from the job description where they genuinely apply.
- Be concise — profile max 4 sentences, each experience entry max 5 tailored bullets.
- adapted_cv_text must be a complete, ready-to-submit CV in clean plain text (no markdown fences), formatted as: Name, contact, profile, skills, experience (tailored bullets), education. Use dashes for bullets.
- cover_letter must be 3–4 paragraphs: opening hook, why you're a strong match, key achievements, closing call-to-action. Address "Dear Hiring Manager" if no name is known.
- Output ONLY valid JSON, no markdown fences, no extra text.`;

    const userPrompt = `JOB DESCRIPTION:
${dto.jobDescription}

CANDIDATE CV (JSON):
${JSON.stringify(masterCv, null, 2)}

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
      const apiMessage = err?.message ?? 'Gemini API error';
      throw new HttpException(apiMessage, HttpStatus.BAD_GATEWAY);
    }
    const result = JSON.parse(jsonrepair(raw));

    const cv = this.cvsRepo.create({
      jobId: job?.id ?? null,
      company: job?.company ?? dto.company ?? '',
      role: job?.role ?? dto.role ?? '',
      relevanceScore: result.relevance_score,
      keywordsFound: JSON.stringify(result.keywords_found ?? []),
      missingSkills: JSON.stringify(result.missing_skills ?? []),
      adaptedProfile: result.adapted_profile,
      topExperience: JSON.stringify(result.top_experience ?? []),
      adaptedCvText: result.adapted_cv_text,
      coverLetter: result.cover_letter,
      advice: result.advice,
    });

    const saved = await this.cvsRepo.save(cv);
    return this.parseJsonFields(saved);
  }
}
