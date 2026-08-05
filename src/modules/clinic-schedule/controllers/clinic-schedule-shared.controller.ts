import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import { CalendarQueryDto } from '../dto/calendar-query.dto';
import { CalendarDayResponseDto } from '../dto/schedule-response.dto';
import { ClinicScheduleService } from '../services/clinic-schedule.service';

@ApiTags('Clinic Schedule — Shared')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('clinic-schedule')
export class ClinicScheduleSharedController {
  constructor(private readonly clinicScheduleService: ClinicScheduleService) {}

  @Get('calendar')
  @ApiOperation({
    summary:
      'Month calendar: isWorkingDay + isBookable (patients respect booking horizon)',
  })
  @ApiBaseResponse(CalendarDayResponseDto)
  getCalendar(
    @Query() query: CalendarQueryDto,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    const permissions = new Set(
      user.roles.flatMap((role) => role.permissions),
    );
    const isStaffScheduleViewer = permissions.has('manage_schedule');

    return this.clinicScheduleService.getCalendarMonth(
      query.year,
      query.month,
      { isStaffScheduleViewer },
    );
  }
}
