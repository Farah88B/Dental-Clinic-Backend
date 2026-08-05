import { Injectable } from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import { RawAppointment } from '../selectors/appointment.select';

@Injectable()
export class AppointmentAdapter {
  adapt(raw: RawAppointment): AppointmentResponseDto {
    return new AppointmentResponseDto({
      id: raw.id,
      patientId: raw.patientId,
      createdById: raw.createdById,
      treatmentSessionId: raw.treatmentSessionId,
      confirmedById: raw.confirmedById,
      cancelledById: raw.cancelledById,
      rescheduledById: raw.rescheduledById,
      type: raw.type,
      scheduledAt: raw.scheduledAt,
      durationMinutes: raw.durationMinutes,
      status: raw.status,
      isWaiting: raw.isWaiting,
      reasonForVisit: raw.reasonForVisit,
      chatbotSummary: raw.chatbotSummary,
      notes: raw.notes,
      confirmedAt: raw.confirmedAt,
      cancellationReason: raw.cancellationReason,
      cancelledAt: raw.cancelledAt,
      rescheduledAt: raw.rescheduledAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
