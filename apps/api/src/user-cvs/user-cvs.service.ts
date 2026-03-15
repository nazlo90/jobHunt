import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCv } from '../database/entities/user-cv.entity';

@Injectable()
export class UserCvsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(UserCv)
    private readonly repo: Repository<UserCv>,
  ) {}

  // synchronize: false means TypeORM won't auto-create the table; create it once on startup
  async onApplicationBootstrap() {
    await this.repo.manager.query(`
      CREATE TABLE IF NOT EXISTS user_cvs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        filename   TEXT NOT NULL,
        cv_text    TEXT NOT NULL,
        pdf_data   BLOB,
        created_at DATETIME NOT NULL DEFAULT (datetime('now'))
      )
    `);
    // migration: add pdf_data column if the table already existed without it
    const cols: Array<{ name: string }> = await this.repo.manager.query(
      `PRAGMA table_info(user_cvs)`,
    );
    if (!cols.some(c => c.name === 'pdf_data')) {
      await this.repo.manager.query(`ALTER TABLE user_cvs ADD COLUMN pdf_data BLOB`);
    }
  }

  findAll(): Promise<UserCv[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, select: ['id', 'name', 'filename', 'cvText', 'createdAt'] });
  }

  async findOne(id: number): Promise<UserCv> {
    const cv = await this.repo.findOne({ where: { id } });
    if (!cv) throw new NotFoundException(`UserCv #${id} not found`);
    return cv;
  }

  async getFile(id: number): Promise<{ pdfData: Buffer; filename: string }> {
    const cv = await this.findOne(id);
    if (!cv.pdfData) throw new NotFoundException(`No PDF stored for UserCv #${id}`);
    return { pdfData: cv.pdfData, filename: cv.filename };
  }

  create(name: string, filename: string, cvText: string, pdfData: Buffer): Promise<UserCv> {
    return this.repo.save(this.repo.create({ name, filename, cvText, pdfData }));
  }

  async remove(id: number): Promise<void> {
    const cv = await this.findOne(id);
    await this.repo.remove(cv);
  }
}
