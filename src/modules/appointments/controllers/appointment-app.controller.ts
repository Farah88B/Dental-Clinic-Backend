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
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { CreateAppAppointmentDto } from '../dto/create-app-appointment.dto';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto';
import { AppointmentService } from '../services/appointment.service';

@ApiTags('Appointments — Mobile App')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentAppController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @AuditAction('CREATE_APPOINTMENT')
  @ApiOperation({
    summary: 'Book an appointment - Used by: Patient Mobile App',
  })
  @ApiBaseResponse(AppointmentResponseDto, 201)
  create(
    @Body() dto: CreateAppAppointmentDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.createFromApp(dto, accountId);
  }

  @Patch(':id/reschedule')
  @AuditAction('RESCHEDULE_APPOINTMENT')
  @ApiOperation({
    summary:
      'Reschedule own appointment within cancel/reschedule window - Patient App',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.rescheduleFromApp(id, dto, accountId);
  }

  @Post(':id/cancel')
  @AuditAction('CANCEL_APPOINTMENT')
  @ApiOperation({
    summary:
      'Cancel own appointment within cancel/reschedule window - Patient App',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelAppointmentDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.cancelFromApp(id, dto, accountId);
  }
}
