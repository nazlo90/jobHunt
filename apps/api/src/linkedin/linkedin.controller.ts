import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { LinkedInService } from './linkedin.service';

@Controller('linkedin')
export class LinkedInController {
  constructor(private readonly linkedInService: LinkedInService) {}

  @Post('comment')
  @HttpCode(HttpStatus.OK)
  async generateComment(
    @Body() body: { postText: string; authorName?: string; authorTitle?: string },
  ) {
    try {
      const comments = await this.linkedInService.generateComments({
        postText: body.postText,
        authorName: body.authorName ?? '',
        authorTitle: body.authorTitle ?? '',
      });
      return { ok: true, comments };
    } catch (e: any) {
      return { ok: false, error: e?.message, stack: e?.stack?.split('\n').slice(0, 5) };
    }
  }

  @Post('write')
  @HttpCode(HttpStatus.OK)
  async generatePost(@Body() body: { category: string; seedIdea?: string }) {
    const posts = await this.linkedInService.generatePosts(body.category, body.seedIdea ?? '');
    return { ok: true, posts };
  }

  @Post('dm')
  @HttpCode(HttpStatus.OK)
  async generateDM(
    @Body() body: {
      recruiterName: string;
      company: string;
      roleTitle: string;
      companyNote?: string;
    },
  ) {
    const result = await this.linkedInService.generateDM({
      recruiterName: body.recruiterName,
      company: body.company,
      roleTitle: body.roleTitle,
      companyNote: body.companyNote ?? '',
    });
    return { ok: true, dm: result.text };
  }
}
