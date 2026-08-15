import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/env.validation';
import { ConfigModule } from '@nestjs/config';
import { IngressModule } from './ingress/ingress.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    IngressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
