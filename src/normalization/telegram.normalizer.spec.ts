import updates from '../../test/fixtures/text.json';
import { normalizeTelegramUpdate } from './telegram.normalizer';

const [text, command, photo, sticker] = updates;

describe('normalizeTelegramUpdate', () => {
  it('текстовое сообщение', () => {
    const result = normalizeTelegramUpdate(text);

    expect(result?.text).toBe('Вопрос по заказу 333');
    expect(result?.attachments).toHaveLength(0);
    expect(result?.contact.externalId).toBe('111111');
  });

  it('команда', () => {
    const result = normalizeTelegramUpdate(command);

    expect(result?.text).toBe('/start');
    expect(result?.attachments).toHaveLength(0);
    expect(result?.contact.externalId).toBe('111111');
  });

  it('фото', () => {
    const result = normalizeTelegramUpdate(photo);

    expect(result?.text).toBe(null);
    expect(result?.attachments).toHaveLength(1);
    expect(result?.contact.externalId).toBe('111111');
  });

  it('стикер', () => {
    const result = normalizeTelegramUpdate(sticker);

    expect(result?.text).toBe('😫');
    expect(result?.attachments).toHaveLength(1);
    expect(result?.contact.externalId).toBe('111111');
  });
});
