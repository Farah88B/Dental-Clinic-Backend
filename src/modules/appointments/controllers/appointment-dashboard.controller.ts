import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  HasPagination,
  PaginationQuery,
} from 'src/common/pagination/pagination-query-params.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import {
  AppointmentListQueryDto,
  AppointmentStaffListResponseDto,
} from '../dto/appointment-list.dto';
import { ClinicCheckInCodeResponseDto } from '../dto/app-check-in.dto';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { CreateDashboardAppointmentDto } from '../dto/create-dashboard-appointment.dto';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto';
import { AppointmentQueryService } from '../services/appointment-query.service';
import { AppointmentService } from '../services/appointment.service';

@ApiTags('Appointments — Staff Dashboard')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard/appointments')
export class AppointmentDashboardController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly appointmentQueryService: AppointmentQueryService,
  ) {}

  @Get()
  @RequirePermission('view_appointments')
  @HasPagination()
  @ApiOperation({
    summary:
      'Search/filter/sort appointments with status and waiting counts - Staff',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  @ApiQuery({ name: 'isWaiting', required: false, type: Boolean })
  @ApiQuery({ name: 'scheduledFrom', required: false })
  @ApiQuery({ name: 'scheduledTo', required: false })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['scheduledAt', 'createdAt', 'status'],
  })
  @ApiQuery({ name: 'sortDirection', required: false, enum: ['asc', 'desc'] })
  @ApiBaseResponse(AppointmentStaffListResponseDto)
  list(@PaginationQuery() query: AppointmentListQueryDto) {
    return this.appointmentQueryService.listForStaff(query);
  }

  @Get('check-in-code')
  @RequirePermission('view_appointments')
  @ApiOperation({
    summary:
      'Get printable clinic wall QR payload for patient app check-in - Staff',
  })
  @ApiBaseResponse(ClinicCheckInCodeResponseDto)
  getCheckInCode() {
    return this.appointmentService.getClinicCheckInCode();
  }

  @Get(':id')
  @RequirePermission('view_appointments')
  @ApiOperation({ summary: 'Get appointment details - Staff' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentQueryService.getByIdForStaff(id);
  }

  @Post()
  @RequirePermission('create_appointment')
  @AuditAction('CREATE_APPOINTMENT')
  @ApiOperation({
    summary: 'Book an appointment - Used by: Staff Dashboard',
  })
  @ApiBaseResponse(AppointmentResponseDto, 201)
  create(
    @Body() dto: CreateDashboardAppointmentDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.createFromDashboard(dto, accountId);
  }

  @Patch(':id/reschedule')
  @RequirePermission('update_appointment')
  @AuditAction('RESCHEDULE_APPOINTMENT')
  @ApiOperation({
    summary:
      'Reschedule appointment (bypasses patient cancel/reschedule window) - Staff',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.rescheduleFromDashboard(id, dto, accountId);
  }

  @Post(':id/cancel')
  @RequirePermission('cancel_appointment')
  @AuditAction('CANCEL_APPOINTMENT')
  @ApiOperation({
    summary:
      'Cancel appointment (bypasses patient cancel/reschedule window) - Staff',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelAppointmentDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.cancelFromDashboard(id, dto, accountId);
  }

  @Post(':id/confirm')
  @RequirePermission('update_appointment')
  @AuditAction('CONFIRM_APPOINTMENT')
  @ApiOperation({
    summary: 'Confirm pending appointment - Staff',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.confirmFromDashboard(id, accountId);
  }

  @Post(':id/reject')
  @RequirePermission('cancel_appointment')
  @AuditAction('REJECT_APPOINTMENT')
  @ApiOperation({
    summary: 'Reject pending appointment (cancels it) - Staff',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelAppointmentDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.rejectFromDashboard(id, dto, accountId);
  }

  @Post(':id/check-in')
  @RequirePermission('update_appointment')
  @AuditAction('CHECK_IN_APPOINTMENT')
  @ApiOperation({
    summary: 'Check in a confirmed appointment (no GPS) - Staff',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  checkIn(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.checkInFromDashboard(id, accountId);
  }
}
