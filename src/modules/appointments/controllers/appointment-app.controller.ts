import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { AuditAction } from 'src/common/decorators/audit-user-action.decorator';
import { ReqUser } from 'src/common/decorators/req-user.decorator';
import {
  HasPagination,
  PaginationQuery,
} from 'src/common/pagination/pagination-query-params.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import {
  AppointmentListItemDto,
  PatientAppointmentListQueryDto,
  UpcomingAppointmentQueryDto,
} from '../dto/appointment-list.dto';
import { AppCheckInDto } from '../dto/app-check-in.dto';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { CreateAppAppointmentDto } from '../dto/create-app-appointment.dto';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto';
import { AppointmentQueryService } from '../services/appointment-query.service';
import { AppointmentService } from '../services/appointment.service';

@ApiTags('Appointments — Mobile App')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentAppController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly appointmentQueryService: AppointmentQueryService,
  ) {}

  @Get('upcoming')
  @ApiOperation({
    summary: 'Next upcoming appointment for home screen - Patient App',
  })
  @ApiBaseResponse(AppointmentListItemDto)
  getUpcoming(
    @Query() query: UpcomingAppointmentQueryDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentQueryService.getUpcomingForPatient(
      query.patientId,
      accountId,
    );
  }

  @Get()
  @HasPagination()
  @ApiOperation({
    summary: 'List patient appointments by scope UPCOMING|PAST - Patient App',
  })
  @ApiPaginatedResponse(AppointmentListItemDto)
  list(
    @PaginationQuery() query: PatientAppointmentListQueryDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentQueryService.listForPatient(query, accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment details - Patient App' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBaseResponse(AppointmentResponseDto)
  getById(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentQueryService.getByIdForApp(id, accountId);
  }

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

  @Post('check-in')
  @AuditAction('CHECK_IN_APPOINTMENT')
  @ApiOperation({
    summary:
      'Check in by scanning clinic wall QR + GPS geofence - Patient App',
  })
  @ApiBaseResponse(AppointmentResponseDto)
  checkIn(
    @Body() dto: AppCheckInDto,
    @ReqUser('id') accountId: number,
  ) {
    return this.appointmentService.checkInFromApp(dto, accountId);
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
