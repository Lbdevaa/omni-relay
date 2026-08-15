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

@Controller('webhook')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TelegramSecretGuard)
  handleUpdate(@Body() update: unknown): void {
    this.logger.log(JSON.stringify(update));
  }
}
