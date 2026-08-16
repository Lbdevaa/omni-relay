import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Contact } from './contact.entity';

@Entity('messages')
@Index(['channel', 'externalId'], { unique: true })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contact) // много сообщений — один контакт
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @Column({ type: 'varchar' })
  channel: string;

  @Column({ type: 'varchar' })
  direction: 'in' | 'out';

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ name: 'external_id', type: 'varchar' })
  externalId: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>; // граница с чужими данными, где тип честно неизвестен

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
