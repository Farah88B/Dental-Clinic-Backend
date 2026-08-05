import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { HasPagination, PaginationQuery } from 'src/common/pagination/pagination-query-params.decorator';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { ContentService } from '../services/content.service';
import { ContentResponseDto } from '../dto/content-response.dto';

@ApiTags('Content - Patient App')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('app/contents')
export class ContentPatientController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @HasPagination()
  @ApiOperation({ summary: 'List published content — يُستخدم من: تطبيق المريض' })
  @ApiPaginatedResponse(ContentResponseDto)
  list(
    @PaginationQuery() pagination: PaginationDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.contentService.listPublished(pagination, preferredLanguage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a published content item — يُستخدم من: تطبيق المريض' })
  @ApiBaseResponse(ContentResponseDto)
  getById(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.contentService.getPublishedById(id, preferredLanguage);
  }
}
