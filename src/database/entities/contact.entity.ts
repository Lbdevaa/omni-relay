import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('contacts') // — класс отображается на таблицу contacts
@Index(['channel', 'externalId'], { unique: true }) // над классом — индекс по нескольким колонкам, поэтому он относится к таблице, а не к отдельному полю. В списке — имена свойств класса (externalId), а не колонок (external_id).
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // channel	varchar	telegram / vk, email

  @Column({ type: 'varchar' })
  channel: string;

  @Column({ name: 'external_id', type: 'varchar' })
  externalId: string;

  @Column({ name: 'display_name', type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

