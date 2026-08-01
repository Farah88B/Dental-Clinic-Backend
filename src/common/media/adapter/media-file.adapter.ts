import { Injectable } from '@nestjs/common';
import { Adapter } from 'src/common/adapter/interfaces/adapter.interface';
import { MediaFileResponseDto } from '../dto/media-file-response.dto';
import { buildPublicMediaUrl } from '../helpers/media-path.helper';
import { RawMediaFile } from '../selectors/media-file.select';

@Injectable()
export class MediaFileAdapter
  implements Adapter<MediaFileResponseDto, RawMediaFile>
{
  async adapt(raw: RawMediaFile): Promise<MediaFileResponseDto> {
    return new MediaFileResponseDto({
      id: raw.id,
      originalName: raw.originalName,
      storedName: raw.storedName,
      path: raw.path,
      url: buildPublicMediaUrl(raw.path),
      mimeType: raw.mimeType,
      size: raw.size,
      category: raw.category,
      createdAt: raw.createdAt,
    });
  }

  async fromArray(raws: RawMediaFile[]): Promise<MediaFileResponseDto[]> {
    return Promise.all(raws.map((raw) => this.adapt(raw)));
  }
}
