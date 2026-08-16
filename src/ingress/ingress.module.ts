import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';

// механика видимости: RabbitmqModule экспортирует сервис, IngressModule его импортирует —
// только после этого контроллер может его получить
@Module({
  imports: [RabbitmqModule],
  controllers: [TelegramController],
})
export class IngressModule {}
