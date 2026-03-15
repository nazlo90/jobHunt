import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ScraperConfigService } from './scraper-config.service';
import { UpdateScraperConfigDto } from './update-scraper-config.dto';

@Controller('config')
export class ScraperConfigController {
  constructor(private readonly service: ScraperConfigService) {}

  @Get()
  async get() {
    return { ok: true, config: await this.service.get() };
  }

  @Patch()
  async update(@Body() dto: UpdateScraperConfigDto) {
    return { ok: true, config: await this.service.update(dto) };
  }
}
