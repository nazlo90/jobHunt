import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';

/**
 * Custom MCP Server exposing JobHunt tools to Claude.
 *
 * Tools exposed:
 *   - search_jobs       search/filter jobs from the DB
 *   - get_job_stats     pipeline summary stats
 *   - update_job_status change status of a tracked job
 *
 * Built with the `mcp-builder` + `typescript-mcp-server-generator` skills.
 * To scaffold a full standalone MCP server: run `/typescript-mcp-server-generator`
 *
 * For now this is a stub that documents the intended MCP tool surface.
 * When you're ready to expose this over HTTP/stdio, use `@modelcontextprotocol/sdk`.
 */
@Injectable()
export class McpServer implements OnModuleInit {
  private readonly logger = new Logger(McpServer.name);

  constructor(private readonly jobsService: JobsService) {}

  onModuleInit() {
    this.logger.log('MCP tool surface ready (stub). Run /typescript-mcp-server-generator to scaffold the full server.');
  }

  // MCP server runs as the primary user (userId=1) — no HTTP session available
  private readonly MCP_USER_ID = 1;

  // --- Tool: search_jobs ---
  // Input: { query?: string, status?: string, source?: string, sortBy?: string }
  // Output: Job[]
  async searchJobs(params: { query?: string; status?: string; source?: string; sortBy?: string }) {
    return this.jobsService.findAll({
      search: params.query,
      status: params.status,
      source: params.source,
      sortBy: params.sortBy as any,
    }, this.MCP_USER_ID);
  }

  // --- Tool: get_job_stats ---
  // Output: { total, pipeline, offers, thisWeek, byStatus, bySource }
  async getJobStats() {
    return this.jobsService.getStats(this.MCP_USER_ID);
  }

  // --- Tool: update_job_status ---
  // Input: { id: number, status: JobStatus }
  async updateJobStatus(id: number, status: string) {
    return this.jobsService.update(id, { status: status as any }, this.MCP_USER_ID);
  }
}
