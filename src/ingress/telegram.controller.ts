// принимает HTTP-запрос от Telegram
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TelegramSecretGuard } from './telegram-secret.guard';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';

@Controller('webhook')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);
  constructor(private readonly rabbitmq: RabbitmqService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TelegramSecretGuard)
  handleUpdate(@Body() update: unknown): void {
    this.logger.log(JSON.stringify(update)); // TODO: only update_id
    this.rabbitmq.publish('incoming.telegram', update);
  }
}
