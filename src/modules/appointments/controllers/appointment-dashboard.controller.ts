import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiBaseResponse } from 'src/common/decorators/api-base-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { CreateDashboardAppointmentDto } from '../dto/create-dashboard-appointment.dto';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto';
import { AppointmentService } from '../services/appointment.service';

@ApiTags('Appointments — Staff Dashboard')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard/appointments')
export class AppointmentDashboardController {
  constructor(private readonly appointmentService: AppointmentService) {}

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
}
