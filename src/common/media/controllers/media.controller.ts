import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MediaFileCategory } from '@prisma/client';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { createMediaMulterOptions } from '../config/media-multer.config';
import { MediaService } from '../services/media.service';
import { MediaFileResponseDto } from '../dto/media-file-response.dto';

@ApiTags('Media')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', createMediaMulterOptions(MediaFileCategory.CONTENT_IMAGE)),
  )
  @ApiOperation({
    summary:
      'Upload a content image via common media module — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(MediaFileResponseDto, 201)
  upload(
    @UploadedFile() file: Express.Multer.File,
    @ReqUser('id') accountId: number,
  ) {
    return this.mediaService.save(
      file,
      MediaFileCategory.CONTENT_IMAGE,
      accountId,
    );
  }
}
