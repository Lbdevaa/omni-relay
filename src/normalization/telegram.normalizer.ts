// превратит апдейт Telegram в свою модель
import { NormalizedAttachment, NormalizedMessage } from './normalized-message';

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
  };
  chat: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    type: string;
  };
  date: number;
  text?: string;
  caption?: string;
  photo?: {
    file_id: string;
  }[];
  sticker?: { file_id: string; emoji?: string };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// обработка на message
// остальное null: edited_message, callback_query, my_chat_member

export function normalizeTelegramUpdate(
  update: TelegramUpdate,
): NormalizedMessage | null {
  const message = update.message;
  if (!message) return null;

  const attachments: NormalizedAttachment[] = [];

  if (message.photo?.length) {
    attachments.push({
      type: 'photo',
      fileId: message.photo[message.photo.length - 1].file_id, // превью по возрастанию размера
    });
  }

  if (message.sticker) {
    attachments.push({ type: 'sticker', fileId: message.sticker.file_id });
  }

  const displayName =
    [message.from.first_name, message.from.last_name]
      .filter(Boolean)
      .join(' ') || null;

  return {
    channel: 'telegram',
    externalId: String(update.update_id),
    contact: {
      externalId: String(message.from.id),
      displayName,
      username: message.from.username ?? null,
    },
    text: message.text ?? message.caption ?? message.sticker?.emoji ?? null,
    attachments,
    sentAt: new Date(message.date * 1000),
    payload: update as unknown as Record<string, unknown>,
  };
}
