import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNotEmpty, IsString } from 'class-validator';
import { Response } from 'express';
import { UserCvsService } from './user-cvs.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

class CreateUserCvDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() cvText: string;
}

@Controller('user-cvs')
export class UserCvsController {
  constructor(private readonly svc: UserCvsService) {}

  @Get()
  async list(@CurrentUser() user: User) {
    const cvs = await this.svc.findAll(user.id);
    return { ok: true, cvs };
  }

  @Post()
  @UseInterceptors(FileInterceptor('pdf', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateUserCvDto,
    @CurrentUser() user: User,
  ) {
    const cv = await this.svc.create(
      dto.name,
      file?.originalname ?? 'cv.pdf',
      dto.cvText,
      file?.buffer ?? Buffer.alloc(0),
      user.id,
    );
    return { ok: true, cv };
  }

  @Get(':id/file')
  async getFile(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { pdfData, filename } = await this.svc.getFile(id, user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': pdfData.length,
    });
    res.end(pdfData);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.svc.remove(id, user.id);
  }
}
