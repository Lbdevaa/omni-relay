import { Module } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from 'src/database/entities/contact.entity';
import { Message } from 'src/database/entities/message.entity';

@Module({
  imports: [RabbitmqModule, TypeOrmModule.forFeature([Contact, Message])],
  providers: [ConsumerService],
})
export class ConsumerModule {}
