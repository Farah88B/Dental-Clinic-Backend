import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import { HasPagination } from 'src/common/pagination/pagination-query-params.decorator';
import { NotificationListQueryDto } from '../dto/notification-list-query.dto';
import {
  NotificationCountResponseDto,
  NotificationResponseDto,
} from '../dto/notification-response.dto';
import { NotificationService } from '../services/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @HasPagination()
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiOperation({
    summary:
      'List notifications for the authenticated account (localized title/body)',
  })
  @ApiPaginatedResponse(NotificationResponseDto)
  list(
    @Query() query: NotificationListQueryDto,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    return this.notificationService.listForAccount(
      user.id,
      query,
      user.preferredLanguage === 'en' ? 'en' : 'ar',
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread notification count for the current account' })
  @ApiBaseResponse(NotificationCountResponseDto)
  unreadCount(@ReqUser('id') accountId: number) {
    return this.notificationService.unreadCount(accountId);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all unread notifications as read for the current account',
  })
  @ApiBaseResponse(NotificationCountResponseDto)
  markAllRead(@ReqUser('id') accountId: number) {
    return this.notificationService.markAllRead(accountId);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a notification as read (idempotent if already read)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(NotificationResponseDto)
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    return this.notificationService.markRead(
      user.id,
      id,
      user.preferredLanguage === 'en' ? 'en' : 'ar',
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a notification belonging to the authenticated account',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(NotificationResponseDto)
  @ApiExcludeEndpoint()
  delete(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    return this.notificationService.delete(
      user.id,
      id,
      user.preferredLanguage === 'en' ? 'en' : 'ar',
    );
  }
}
