import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/env.validation';
import { ConfigModule } from '@nestjs/config';
import { IngressModule } from './ingress/ingress.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { RabbitmqService } from './rabbitmq/rabbitmq.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    IngressModule,
    RabbitmqModule,
  ],
  controllers: [AppController],
  providers: [AppService, RabbitmqService],
})
export class AppModule {}
