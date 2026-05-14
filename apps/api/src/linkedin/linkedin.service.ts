import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';

export interface CommentVariants {
  punchy: string;
  question: string;
  insight: string;
  experience: string;
  challenge: string;
}

export interface PostVariant {
  variant: number;
  text: string;
}

// Bypass TypeScript's import→require compilation so ESM src files load correctly in production
const esmImport = new Function('path', 'return import(path)') as (path: string) => Promise<any>;

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);

  private get srcBase(): string {
    return process.env['LINKEDIN_SRC_PATH'] ?? path.resolve(__dirname, '../../../../src');
  }

  async generateComments(post: { postText: string; authorName: string; authorTitle: string }): Promise<CommentVariants> {
    const { generateComments } = await esmImport(`${this.srcBase}/ai/commentGenerator.js`);
    return generateComments(post) as Promise<CommentVariants>;
  }

  async generatePosts(category: string, seedIdea: string): Promise<PostVariant[]> {
    const { generatePosts } = await esmImport(`${this.srcBase}/ai/postGenerator.js`);
    return generatePosts(category, seedIdea) as Promise<PostVariant[]>;
  }

  async generateDM(input: {
    recruiterName: string;
    company: string;
    roleTitle: string;
    companyNote: string;
  }): Promise<{ text: string }> {
    const { generateDM } = await esmImport(`${this.srcBase}/ai/dmGenerator.js`);
    return generateDM(input) as Promise<{ text: string }>;
  }
}
