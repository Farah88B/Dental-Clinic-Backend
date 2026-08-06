import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { AuthenticatedAccount } from 'src/common/interfaces/authenticated-account.interface';
import {
  AvailableDayResponseDto,
  AvailableSlotResponseDto,
} from '../dto/appointment-response.dto';
import {
  AvailableDaysQueryDto,
  AvailableSlotsQueryDto,
} from '../dto/availability-query.dto';
import { AppointmentAvailabilityService } from '../services/appointment-availability.service';

@ApiTags('Appointments — Availability (Shared)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('appointments/availability')
export class AppointmentSharedController {
  constructor(
    private readonly availabilityService: AppointmentAvailabilityService,
  ) {}

  @Get('days')
  @ApiOperation({
    summary:
      'Bookable days in a month (has at least one slot for the service duration)',
  })
  @ApiBaseResponse(AvailableDayResponseDto)
  getDays(
    @Query() query: AvailableDaysQueryDto,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    const access = this.resolveAccess(user);
    return this.availabilityService.getBookableDays(query, access);
  }

  @Get('slots')
  @ApiOperation({
    summary: 'Available HH:mm start times for a given clinic date',
  })
  @ApiBaseResponse(AvailableSlotResponseDto)
  getSlots(
    @Query() query: AvailableSlotsQueryDto,
    @ReqUser() user: AuthenticatedAccount,
  ) {
    const access = this.resolveAccess(user);
    return this.availabilityService.getAvailableSlots(query, access);
  }

  private resolveAccess(user: AuthenticatedAccount) {
    const permissions = new Set(
      user.roles.flatMap((role) => role.permissions),
    );
    const isStaff =
      permissions.has('create_appointment') ||
      permissions.has('view_appointments');

    if (isStaff) {
      return { source: 'DASHBOARD' as const };
    }
    return { source: 'APP' as const, accountId: user.id };
  }
}
