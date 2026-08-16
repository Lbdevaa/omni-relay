import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/env.validation';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IngressModule } from './ingress/ingress.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumerModule } from './consumer/consumer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    IngressModule,
    RabbitmqModule,
    ConsumerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
