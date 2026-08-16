import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type Channel, type ChannelModel } from 'amqplib';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection!: ChannelModel;
  private channel!: Channel;
  constructor(private readonly config: ConfigService) {}

  // подключиться по RABBITMQ_URL из ConfigService, создать канал, объявить топологию — exchange messages типа topic,
  // очередь messages.incoming, binding по ключу incoming.telegram
  // Всё с durable: true
  async onModuleInit() {
    // connect(url) → createChannel() → assertExchange / assertQueue / bindQueue
    const exchange = this.config.getOrThrow<string>('RABBITMQ_EXCHANGE');

    this.connection = await connect(
      this.config.getOrThrow<string>('RABBITMQ_URL'),
    );
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(exchange, 'topic', { durable: true }); // Exchanges messages типа topic
    await this.channel.assertQueue('messages.incoming', { durable: true }); // Queues — messages.incoming
    await this.channel.bindQueue(
      'messages.incoming',
      exchange,
      'incoming.telegram',
    );
  }

  // закрыть канал, потом соединение — именно в этом порядке
  async onModuleDestroy() {
    // channel.close(), затем connection.close()
    await this.channel.close();
    await this.connection.close();
  }

  // — чтобы контроллер не знал ни про amqplib, ни про имя exchange, ни про Buffer
  publish(routingKey: string, payload: unknown): void {
    // channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), { ... })
    this.channel.publish(
      this.config.getOrThrow<string>('RABBITMQ_EXCHANGE'),
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true, contentType: 'application/json' },
    );
  }

  // handleUpdate(@Body() update: unknown): void {
  //   this.logger.log(JSON.stringify(update));
  // }
}
