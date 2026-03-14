import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { McpServer } from './mcp.server';

@Module({
  imports: [JobsModule],
  providers: [McpServer],
})
export class McpModule {}
