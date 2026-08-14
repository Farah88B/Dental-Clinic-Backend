import { Injectable } from '@nestjs/common';
import type { Language } from 'src/common/i18n/helper';
import { pickLocalized } from 'src/common/i18n/localize.helper';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { RawNotification } from '../selectors/notification.select';

@Injectable()
export class NotificationAdapter {
  adapt(
    raw: RawNotification,
    language: Language = 'ar',
  ): NotificationResponseDto {
    const data =
      raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : null;

    return new NotificationResponseDto({
      id: raw.id,
      type: raw.type,
      title: pickLocalized(raw.titleAr, raw.titleEn, language),
      body: pickLocalized(raw.bodyAr, raw.bodyEn, language),
      data,
      isRead: raw.readAt != null,
      createdAt: raw.createdAt,
    });
  }
}
