import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import {
  DeleteScheduleExceptionQueryDto,
  ListScheduleExceptionsQueryDto,
} from '../dto/calendar-query.dto';
import { CreateScheduleExceptionDto } from '../dto/create-schedule-exception.dto';
import {
  ScheduleExceptionResponseDto,
  WorkingHoursResponseDto,
} from '../dto/schedule-response.dto';
import { UpdateScheduleExceptionDto } from '../dto/update-schedule-exception.dto';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';
import { ClinicScheduleService } from '../services/clinic-schedule.service';

@ApiTags('Clinic Schedule — Staff/Web Only')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard/clinic-schedule')
export class ClinicScheduleDashboardController {
  constructor(private readonly clinicScheduleService: ClinicScheduleService) {}

  @Get('working-hours')
  @RequirePermission('manage_schedule')
  @ApiOperation({ summary: 'Get weekly working hours (always 7 days)' })
  @ApiBaseResponse(WorkingHoursResponseDto)
  getWorkingHours() {
    return this.clinicScheduleService.getWorkingHours();
  }

  @Put('working-hours')
  @RequirePermission('manage_schedule')
  @AuditAction('UPDATE_CLINIC_WORKING_HOURS')
  @ApiOperation({ summary: 'Replace weekly working hours (bulk, all 7 days)' })
  @ApiBaseResponse(WorkingHoursResponseDto)
  updateWorkingHours(
    @Body() dto: UpdateWorkingHoursDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.clinicScheduleService.updateWorkingHours(dto, accountId);
  }

  @Get('exceptions')
  @RequirePermission('manage_schedule')
  @ApiOperation({ summary: 'List schedule exceptions (optional date range)' })
  @ApiBaseResponse(ScheduleExceptionResponseDto)
  listExceptions(@Query() query: ListScheduleExceptionsQueryDto) {
    return this.clinicScheduleService.listExceptions(query.from, query.to);
  }

  @Post('exceptions')
  @RequirePermission('manage_schedule')
  @AuditAction('CREATE_SCHEDULE_EXCEPTION')
  @ApiOperation({ summary: 'Create a date-specific schedule exception' })
  @ApiBaseResponse(ScheduleExceptionResponseDto, 201)
  createException(
    @Body() dto: CreateScheduleExceptionDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.clinicScheduleService.createException(dto, accountId);
  }

  @Patch('exceptions/:id')
  @RequirePermission('manage_schedule')
  @AuditAction('UPDATE_SCHEDULE_EXCEPTION')
  @ApiOperation({ summary: 'Update a schedule exception' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(ScheduleExceptionResponseDto)
  updateException(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleExceptionDto,
  ) {
    return this.clinicScheduleService.updateException(id, dto);
  }

  @Delete('exceptions/:id')
  @RequirePermission('manage_schedule')
  @AuditAction('DELETE_SCHEDULE_EXCEPTION')
  @ApiOperation({
    summary: 'Hard-delete a schedule exception (revert date to weekly pattern)',
  })
  @ApiParam({ name: 'id', type: Number })
  deleteException(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DeleteScheduleExceptionQueryDto,
  ) {
    return this.clinicScheduleService.deleteException(id, query.confirmed);
  }
}
