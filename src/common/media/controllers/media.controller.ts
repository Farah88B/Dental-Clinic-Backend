import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MediaService } from '../services/media.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}
}
