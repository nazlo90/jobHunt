import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('user_cvs')
export class UserCv {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  filename: string;

  @Column({ type: 'text', name: 'cv_text' })
  cvText: string;

  @Column({ type: 'blob', name: 'pdf_data', nullable: true })
  pdfData: Buffer | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
