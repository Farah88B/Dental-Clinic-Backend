import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
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
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { HasPagination, PaginationQuery } from 'src/common/pagination/pagination-query-params.decorator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { createMediaMulterOptions } from 'src/common/media/config/media-multer.config';
import { ContentService } from '../services/content.service';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import { ContentResponseDto } from '../dto/content-response.dto';

@ApiTags('Content (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contents')
export class ContentStaffController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @HasPagination()
  @RequirePermission('manage_content')
  @ApiOperation({ summary: 'List all content — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiPaginatedResponse(ContentResponseDto)
  list(
    @PaginationQuery() pagination: PaginationDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.contentService.listStaff(pagination, preferredLanguage);
  }

  @Get(':id')
  @RequirePermission('manage_content')
  @ApiOperation({ summary: 'Get content by id — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(ContentResponseDto)
  getById(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.contentService.getByIdStaff(id, preferredLanguage);
  }

  @Post()
  @RequirePermission('manage_content')
  @AuditAction('CREATE_CONTENT')
  @ApiOperation({ summary: 'Create content — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(ContentResponseDto, 201)
  create(
    @Body() dto: CreateContentDto,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.contentService.create(dto, accountId, preferredLanguage);
  }

  @Patch(':id')
  @RequirePermission('manage_content')
  @AuditAction('UPDATE_CONTENT')
  @ApiOperation({ summary: 'Update content — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(ContentResponseDto)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContentDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.contentService.update(id, dto, preferredLanguage);
  }

  @Delete(':id')
  @RequirePermission('manage_content')
  @AuditAction('ARCHIVE_CONTENT')
  @ApiOperation({ summary: 'Archive content — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(ContentResponseDto)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.contentService.archive(id, preferredLanguage);
  }

  @Post(':id/media')
  @RequirePermission('manage_content')
  @AuditAction('ADD_CONTENT_MEDIA')
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
    FileInterceptor(
      'file',
      createMediaMulterOptions(MediaFileCategory.CONTENT_IMAGE),
    ),
  )
  @ApiOperation({
    summary: 'Upload and link a content image — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(ContentResponseDto, 201)
  addMedia(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @ReqUser('id') accountId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.contentService.addMedia(id, file, accountId, preferredLanguage);
  }

  @Delete(':id/media/:mediaFileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('manage_content')
  @AuditAction('REMOVE_CONTENT_MEDIA')
  @ApiOperation({ summary: 'Remove a content image — يُستخدم من: لوحة تحكم الطاقم' })
  removeMedia(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaFileId', ParseIntPipe) mediaFileId: number,
  ) {
    return this.contentService.removeMedia(id, mediaFileId);
  }
}
