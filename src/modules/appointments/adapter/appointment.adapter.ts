import { Injectable } from '@nestjs/common';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import {
  AppointmentListItemDto,
  AppointmentPatientSummaryDto,
} from '../dto/appointment-list.dto';
import {
  RawAppointment,
  RawAppointmentDetail,
  RawAppointmentListItem,
} from '../selectors/appointment.select';

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
      checkedInById: raw.checkedInById,
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
      checkedInAt: raw.checkedInAt,
      completedAt: raw.completedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  adaptListItem(
    raw: RawAppointmentListItem,
    options: { includePatient: boolean },
  ): AppointmentListItemDto {
    return new AppointmentListItemDto({
      id: raw.id,
      patientId: raw.patientId,
      type: raw.type,
      status: raw.status,
      scheduledAt: raw.scheduledAt,
      durationMinutes: raw.durationMinutes,
      isWaiting: raw.isWaiting,
      reasonForVisit: raw.reasonForVisit,
      patient: options.includePatient
        ? new AppointmentPatientSummaryDto({
            id: raw.patient.id,
            fullName: raw.patient.fullName,
            medicalRecordNumber: raw.patient.medicalRecordNumber,
          })
        : undefined,
    });
  }

  adaptDetail(raw: RawAppointmentDetail): AppointmentResponseDto {
    return new AppointmentResponseDto({
      ...this.adapt(raw),
      patient: new AppointmentPatientSummaryDto({
        id: raw.patient.id,
        fullName: raw.patient.fullName,
        medicalRecordNumber: raw.patient.medicalRecordNumber,
      }),
    });
  }
}
