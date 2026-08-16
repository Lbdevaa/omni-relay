import { Module } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq.service';

@Module({
  providers: [RabbitmqService],
  exports: [RabbitmqService], // обязательно — без этого IngressModule его не увидит.
})
// Тело класса модуля почти всегда пустое
export class RabbitmqModule {}
