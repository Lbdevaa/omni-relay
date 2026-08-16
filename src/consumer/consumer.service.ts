// Единственное место где встречаются очередьнормализация и база.
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Contact } from 'src/database/entities/contact.entity';
import { Message } from 'src/database/entities/message.entity';
import {
  normalizeTelegramUpdate,
  TelegramUpdate,
} from 'src/normalization/telegram.normalizer';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { Repository } from 'typeorm';

@Injectable()
export class ConsumerService implements OnModuleInit {
  constructor(
    private readonly rabbitmq: RabbitmqService,
    // InjectRepository решит Repository<Contact> и Repository<Message> — в рантайме один и тот же класс Repository

    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  private async handle(payload: unknown): Promise<void> {
    // throw new Error('test boom');
    const normalized = normalizeTelegramUpdate(payload as TelegramUpdate);
    if (!normalized) return;

    // findOne → save, и это гонка: два консьюмера пройдут проверку одновременно и вставят обе строки.
    // Уникальный индекс из этапа 3 такое не пропустит — но упадёт с ошибкой, а нам нужно тихо проигнорировать повтор.
    await this.contacts.upsert(
      {
        channel: normalized.channel,
        externalId: normalized.contact.externalId,
        displayName: normalized.contact.displayName,
        username: normalized.contact.username,
      },
      { conflictPaths: ['channel', 'externalId'] },
    );

    const contact = await this.contacts.findOneOrFail({
      where: {
        channel: normalized.channel,
        externalId: normalized.contact.externalId,
      },
    });

    // Сообщение — через orIgnore, это и есть ON CONFLICT DO NOTHING:

    await this.messages
      .createQueryBuilder()
      .insert()
      .values({
        contactId: contact.id,
        channel: normalized.channel,
        direction: 'in',
        text: normalized.text,
        externalId: normalized.externalId,
        payload: normalized.payload,
      })
      .orIgnore()
      .execute();

    // Почему для контакта upsert, а для сообщения orIgnore: контакт может измениться (человек сменил имя или юзернейм), и обновить его полезно.
    // Сообщение неизменно — повторная доставка того же update_id означает ровно то же сообщение.
  }

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.consume('messages.incoming', (payload) =>
      this.handle(payload),
    );
  }
}
