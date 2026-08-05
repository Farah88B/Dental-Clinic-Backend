import { Injectable } from '@nestjs/common';
import {
  pickLocalized,
  UiLanguage,
} from 'src/common/i18n/localize.helper';
import { buildPublicMediaUrl } from 'src/common/media/helpers/media-path.helper';
import { ContentResponseDto, ContentMediaItemDto } from '../dto/content-response.dto';
import { RawContentSelect } from '../selectors/content.select';

@Injectable()
export class ContentAdapter {
  async adapt(
    raw: RawContentSelect,
    language: UiLanguage,
  ): Promise<ContentResponseDto> {
    return new ContentResponseDto({
      id: raw.id,
      type: raw.type,
      status: raw.status,
      title: pickLocalized(raw.titleAr, raw.titleEn, language),
      body: language === 'ar' ? raw.bodyAr : raw.bodyEn,
      mediaFiles: raw.mediaFiles.map(
        (item) =>
          new ContentMediaItemDto({
            id: item.id,
            mediaFileId: item.mediaFileId,
            displayOrder: item.displayOrder,
            originalName: item.mediaFile.originalName,
            mimeType: item.mediaFile.mimeType,
            url: buildPublicMediaUrl(item.mediaFile.path),
          }),
      ),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async fromArray(
    raws: RawContentSelect[],
    language: UiLanguage,
  ): Promise<ContentResponseDto[]> {
    return Promise.all(raws.map((r) => this.adapt(r, language)));
  }
}
