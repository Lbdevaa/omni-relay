import { TelegramSecretGuard } from './telegram-secret.guard';

describe('TelegramSecretGuard', () => {
  it('should be defined', () => {
    expect(new TelegramSecretGuard()).toBeDefined();
  });
});
