import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { TreatmentSessionsService } from 'src/modules/treatment-sessions/services/treatment-sessions.service';
import { CreateTreatmentSessionDto } from 'src/modules/treatment-sessions/dto/create-treatment-session.dto';
import { TreatmentSessionResponseDto } from 'src/modules/treatment-sessions/dto/treatment-session-response.dto';

@ApiTags('Treatment Sessions (Web/Staff Only)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('treatment-plans/:planId/sessions')
export class NestedTreatmentSessionsController {
  constructor(private readonly sessionsService: TreatmentSessionsService) {}

  @Get()
  @RequirePermission('manage_treatment_sessions')
  @ApiOperation({ summary: 'List sessions for a plan — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(TreatmentSessionResponseDto)
  list(
    @Param('planId', ParseIntPipe) planId: number,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionsService.listForPlan(planId, preferredLanguage);
  }

  @Post()
  @RequirePermission('manage_treatment_sessions')
  @AuditAction('CREATE_TREATMENT_SESSION')
  @ApiOperation({ summary: 'Add a session to a plan — يُستخدم من: لوحة تحكم الطاقم' })
  @ApiBaseResponse(TreatmentSessionResponseDto, 201)
  create(
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: CreateTreatmentSessionDto,
    @ReqUser('preferredLanguage') preferredLanguage: string,
  ) {
    return this.sessionsService.create(planId, dto, preferredLanguage);
  }
}
