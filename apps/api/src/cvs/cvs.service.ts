import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Groq from 'groq-sdk';
import { jsonrepair } from 'jsonrepair';
import { Job } from '../database/entities/job.entity';
import { UserCv } from '../database/entities/user-cv.entity';
import { AdaptedCv } from '../database/entities/adapted-cv.entity';
import { GenerateCvDto } from './dto/generate-cv.dto';

@Injectable()
export class CvsService {
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    @InjectRepository(UserCv)
    private readonly userCvsRepo: Repository<UserCv>,
    @InjectRepository(AdaptedCv)
    private readonly adaptedCvsRepo: Repository<AdaptedCv>,
  ) {}

  async review(dto: GenerateCvDto, userId: number): Promise<Record<string, unknown>> {
    const userCv = await this.userCvsRepo.findOne({ where: { id: dto.userCvId, userId } });
    if (!userCv) throw new NotFoundException(`CV ${dto.userCvId} not found`);

    const job = dto.jobId
      ? await this.jobsRepo.findOne({ where: { id: dto.jobId, userId } })
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

    // Save review to DB
    const entity = this.adaptedCvsRepo.create({
      jobId: dto.jobId ?? undefined,
      userId,
      company: job?.company ?? dto.company ?? '',
      role: job?.role ?? dto.role ?? '',
      relevanceScore: result.relevance_score as number,
      keywordsFound: JSON.stringify(result.keywords_found ?? []),
      missingSkills: JSON.stringify(result.missing_skills ?? []),
      adaptedProfile: result.adapted_profile as string,
      topExperience: JSON.stringify(result.top_experience ?? []),
      coverLetter: result.cover_letter as string,
      advice: result.advice as string,
      jobDescription: dto.jobDescription,
      userCvId: dto.userCvId,
    });
    await this.adaptedCvsRepo.save(entity);

    return {
      id: entity.id,
      jobId: entity.jobId,
      company: entity.company,
      role: entity.role,
      relevanceScore: entity.relevanceScore,
      keywordsFound: result.keywords_found ?? [],
      missingSkills: result.missing_skills ?? [],
      adaptedProfile: result.adapted_profile,
      topExperience: result.top_experience ?? [],
      coverLetter: result.cover_letter,
      advice: result.advice,
      jobDescription: entity.jobDescription,
      userCvId: entity.userCvId,
      createdAt: entity.createdAt,
    };
  }

  async getLatestForJob(jobId: number, userId: number): Promise<Record<string, unknown> | null> {
    const entity = await this.adaptedCvsRepo.findOne({
      where: { jobId, userId },
      order: { createdAt: 'DESC' },
    });
    if (!entity) return null;

    return {
      id: entity.id,
      jobId: entity.jobId,
      company: entity.company,
      role: entity.role,
      relevanceScore: entity.relevanceScore,
      keywordsFound: entity.keywordsFound ? JSON.parse(entity.keywordsFound) : [],
      missingSkills: entity.missingSkills ? JSON.parse(entity.missingSkills) : [],
      adaptedProfile: entity.adaptedProfile,
      topExperience: entity.topExperience ? JSON.parse(entity.topExperience) : [],
      coverLetter: entity.coverLetter,
      advice: entity.advice,
      jobDescription: entity.jobDescription,
      userCvId: entity.userCvId,
      createdAt: entity.createdAt,
    };
  }

  // ── adapt ────────────────────────────────────────────────────────────────────

  async adapt(adaptedCvId: number, userId: number): Promise<{ adaptedCvText: string }> {
    const adaptedCv = await this.adaptedCvsRepo.findOne({ where: { id: adaptedCvId, userId } });
    if (!adaptedCv) throw new NotFoundException(`AdaptedCv ${adaptedCvId} not found`);

    if (!adaptedCv.userCvId || !adaptedCv.jobDescription) {
      throw new HttpException(
        'Missing CV or job description — re-run Analyze Match first',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userCv = await this.userCvsRepo.findOne({ where: { id: adaptedCv.userCvId } });
    if (!userCv) throw new NotFoundException(`User CV ${adaptedCv.userCvId} not found`);

    const topExperience: Array<{ role: string; company: string; period: string; bullets: string[] }> =
      adaptedCv.topExperience ? JSON.parse(adaptedCv.topExperience) : [];

    const expFormatted = topExperience.length
      ? topExperience
          .map(exp =>
            `${exp.role} | ${exp.company} | ${exp.period}\n${exp.bullets.map(b => `- ${b}`).join('\n')}`,
          )
          .join('\n\n')
      : '(none — keep all original experience bullets)';

    // The AI can read garbled PDF-extracted text (spaced letters, missing line breaks)
    // and reconstruct clean formatted output that buildCvHtml can parse.
    const systemPrompt = `You are a professional CV editor and formatter.

You receive a raw CV extracted from PDF (may have artifacts: letter-spaced section names like "P R O F I L E", extra spaces, missing line breaks), plus adapted content from a prior analysis.

YOUR TASK: Produce a clean, properly-formatted plain-text CV using this EXACT structure:

[Full Name]
[Job Title]
[Phone | Email]
[LinkedIn URL | GitHub URL]

PROFILE
[profile paragraph]

CORE SKILLS
[Category]: [value1], [value2], ...
[Category]: ...

EMPLOYMENT HISTORY
[Role] | [Company] | [Period]
Domain: [domain]
Tech Stack: [stack]
- [bullet]
- [bullet]

[next job...]

EDUCATION
[Period] | [Degree], [Institution] | [Location]

LANGUAGES
[Language]: [Level]
[Language]: [Level]

COURSES
[Period] | [Course], [Provider]
[Period] | [Course], [Provider]

RULES:
1. Use the adapted profile I provide — do NOT copy the original profile.
2. For each job that has provided adapted bullets, use those bullets — do NOT use original bullets.
3. For jobs NOT in the adapted list, copy original bullets VERBATIM.
4. Copy ALL other content verbatim from the original: contact details, links, skills categories, education, languages, courses.
5. Use the exact section names from the original CV (e.g. "EMPLOYMENT HISTORY" if that's what the original uses).
6. Use " | " to separate role/company/period on one line.
7. Use "- " (dash space) for ALL bullets.
8. Return ONLY the plain-text CV — no markdown fences, no explanations.`;

    const userPrompt = `ADAPTED PROFILE (replace original profile with this):
${adaptedCv.adaptedProfile}

ADAPTED EXPERIENCE BULLETS (replace bullets for these specific jobs):
${expFormatted}

KEYWORDS TO EMPHASISE IN SKILLS: ${
      adaptedCv.keywordsFound ? JSON.parse(adaptedCv.keywordsFound).join(', ') : ''
    }

RAW CV FROM PDF (extract structure from this, keep all sections except profile/adapted-job bullets):
${userCv.cvText}`;

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
        .replace(/^```(?:text|plain)?\s*\n?/m, '')
        .replace(/\n?```\s*$/m, '');
    } catch (err: any) {
      throw new HttpException(err?.message ?? 'Groq API error', HttpStatus.BAD_GATEWAY);
    }

    return { adaptedCvText: raw };
  }
}
