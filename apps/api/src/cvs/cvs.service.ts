import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Groq from 'groq-sdk';
import { jsonrepair } from 'jsonrepair';
import { Job } from '../database/entities/job.entity';
import { UserCv } from '../database/entities/user-cv.entity';
import { GenerateCvDto } from './dto/generate-cv.dto';

@Injectable()
export class CvsService {
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    @InjectRepository(UserCv)
    private readonly userCvsRepo: Repository<UserCv>,
  ) {}

  async generate(dto: GenerateCvDto): Promise<Record<string, unknown>> {
    const userCv = await this.userCvsRepo.findOne({ where: { id: dto.userCvId } });
    if (!userCv) throw new NotFoundException(`CV ${dto.userCvId} not found`);

    const job = dto.jobId
      ? await this.jobsRepo.findOne({ where: { id: dto.jobId } })
      : null;

    const candidateInput = `CANDIDATE CV (plain text extracted from PDF):\n${userCv.cvText}`;

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

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(jsonrepair(raw));
    } catch {
      throw new HttpException('Failed to parse Groq response', HttpStatus.BAD_GATEWAY);
    }

    return {
      company:        job?.company ?? dto.company ?? '',
      role:           job?.role    ?? dto.role    ?? '',
      relevanceScore: result.relevance_score,
      keywordsFound:  result.keywords_found  ?? [],
      missingSkills:  result.missing_skills  ?? [],
      adaptedProfile: result.adapted_profile,
      topExperience:  result.top_experience  ?? [],
      adaptedCvText:  result.adapted_cv_text,
      coverLetter:    result.cover_letter,
      advice:         result.advice,
    };
  }
}
