import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { TreatmentSessionsService } from '../services/treatment-sessions.service';
import { UpdateTreatmentSessionDto } from '../dto/update-treatment-session.dto';
import { CompleteTreatmentSessionDto } from '../dto/complete-treatment-session.dto';
import { TreatmentSessionResponseDto } from '../dto/treatment-session-response.dto';
import { StartTreatmentSessionResponseDto } from '../dto/start-treatment-session-response.dto';

@ApiTags('Treatment Sessions (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treatment-sessions')
export class TreatmentSessionsController {
  constructor(private readonly sessionsService: TreatmentSessionsService) {}

  @Patch(':id')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('UPDATE_TREATMENT_SESSION')
  @ApiOperation({ summary: 'Update a treatment session — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(TreatmentSessionResponseDto)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTreatmentSessionDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionsService.update(id, dto, preferredLanguage);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('DELETE_TREATMENT_SESSION')
  @ApiOperation({ summary: 'Delete a treatment session — يُستخدم من: لوحة تحكم الطاقم' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.sessionsService.delete(id);
  }

  @Post(':id/start')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('START_TREATMENT_SESSION')
  @ApiOperation({
    summary:
      'Start a BOOKED session (IN_TREATMENT), create Encounter if missing, sync appointments — يُستخدم من: لوحة تحكم الطاقم',
  })
  @ApiBaseResponse(StartTreatmentSessionResponseDto, 201)
  start(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionsService.start(id, preferredLanguage);
  }

  @Post(':id/complete')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('COMPLETE_TREATMENT_SESSION')
  @ApiOperation({ summary: 'Complete a treatment session — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(TreatmentSessionResponseDto)
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteTreatmentSessionDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionsService.complete(id, dto, preferredLanguage);
  }

  @Post(':id/cancel')
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('CANCEL_TREATMENT_SESSION')
  @ApiOperation({ summary: 'Cancel a treatment session — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(TreatmentSessionResponseDto)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionsService.cancel(id, preferredLanguage);
  }
}
