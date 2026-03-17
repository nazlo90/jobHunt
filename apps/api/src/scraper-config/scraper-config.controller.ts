import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ScraperConfigService } from './scraper-config.service';
import { UpdateScraperConfigDto } from './update-scraper-config.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

@Controller('config')
export class ScraperConfigController {
  constructor(private readonly service: ScraperConfigService) {}

  @Get()
  async get(@CurrentUser() user: User) {
    return { ok: true, config: await this.service.get(user.id) };
  }

  @Patch()
  async update(@Body() dto: UpdateScraperConfigDto, @CurrentUser() user: User) {
    return { ok: true, config: await this.service.update(dto, user.id) };
  }
}
