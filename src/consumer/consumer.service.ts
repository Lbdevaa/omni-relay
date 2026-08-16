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
    const normalized = normalizeTelegramUpdate(payload as TelegramUpdate);
    if (!normalized) return;

    let contact = await this.contacts.findOne({
      where: {
        channel: normalized.channel,
        externalId: normalized.contact.externalId,
      },
    });

    // create собирает объект сущности в памяти, никуда не ходит
    // save выполняет INSERT
    if (!contact) {
      contact = await this.contacts.save(
        this.contacts.create({
          channel: normalized.channel,
          externalId: normalized.contact.externalId,
          displayName: normalized.contact.displayName,
          username: normalized.contact.username,
        }),
      );
    }

    await this.messages.save(
      this.messages.create({
        contactId: contact.id,
        channel: normalized.channel,
        direction: 'in',
        text: normalized.text,
        externalId: normalized.externalId,
        payload: normalized.payload,
      }),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.consume('messages.incoming', (payload) =>
      this.handle(payload),
    );
  }
}
