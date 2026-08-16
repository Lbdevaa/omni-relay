export interface NormalizedContact {
  externalId: string;
  displayName: string | null;
  username: string | null;
}

export interface NormalizedAttachment {
  type: 'photo' | 'sticker' | 'document' | 'video' | 'voice';
  fileId: string;
}

// Проектирование шлюза под мессенджеры/почту
export interface NormalizedMessage {
  channel: string;
  externalId: string;
  contact: NormalizedContact;
  text: string | null;
  attachments: NormalizedAttachment[];
  sentAt: Date;
  payload: Record<string, any>; // граница с чужими данными, где тип честно неизвестен
}
