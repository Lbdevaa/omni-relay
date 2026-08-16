// единственная точка контакта с брокером - единственное место, где сходятся очередь, нормализация и база
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  ConsumeMessage,
  type Channel,
  type ChannelModel,
} from 'amqplib'; // Консьюмер не должен знать про amqplib

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
    await this.channel.prefetch(
      // Это ограничение на число неподтверждённых сообщений у одного потребителя. Без него брокер отдаёт всё, что есть: один процесс забирает тысячу сообщений в память, а второй инстанс простаивает. prefetch(0) означает «без ограничения» — именно поэтому в схеме валидации стоит min(1).
      // В UI это видно как колонка Unacked: она не должна превышать значение prefetch.
      this.config.getOrThrow<number>('RABBITMQ_PREFETCH'), // 10
    );

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

  private async handleMessage(
    msg: ConsumeMessage,
    handler: (payload: unknown) => Promise<void>,
  ): Promise<void> {
    try {
      await handler(JSON.parse(msg.content.toString()));
      this.channel.ack(msg);
    } catch (error) {
      this.logger.error(`Обработка не удалась: ${(error as Error).message}`);
      this.channel.nack(msg, false, false);
      // nack(msg, allUpTo, requeue):
      // allUpTo: false — отклонить только это сообщение, а не всё, что было доставлено до него
      // requeue: false — не возвращать в ту же очередь; отсюда сообщение уйдёт в DLX

      // requeue: true на «ядовитом» сообщении — классическая ошибка: оно вернётся в голову очереди, снова упадёт, снова вернётся.
      // Бесконечный цикл, 100% CPU, поток встал.
    }
  }

  async consume(
    queue: string,
    handler: (payload: unknown) => Promise<void>,
  ): Promise<void> {
    await this.channel.consume(
      queue,
      (msg) => {
        if (!msg) return;

        void this.handleMessage(msg, handler);
      },
      // { noAck: true }, // временно и намеренно брокер вычёркивал сообщение сразу при отправке
      { noAck: false },
    );
  }

  // handleUpdate(@Body() update: unknown): void {
  //   this.logger.log(JSON.stringify(update));
  // }
}
