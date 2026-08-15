import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class TelegramSecretGuard implements CanActivate {
  private readonly logger = new Logger(TelegramSecretGuard.name);
  constructor(private readonly config: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-telegram-bot-api-secret-token'];

    if (token !== this.config.getOrThrow<string>('TELEGRAM_WEBHOOK_SECRET')) {
      this.logger.warn(`Rejected webhook request from ${request.ip}`);

      throw new UnauthorizedException(
        'Invalid X-Telegram-Bot-Api-Secret-Token',
      );
    }
    return true;
  }
}
