import { Injectable } from '@nestjs/common';
import type { Language } from 'src/common/i18n/helper';
import { pickLocalized } from 'src/common/i18n/localize.helper';
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
    options: { includePatient: boolean; language?: Language },
  ): AppointmentListItemDto {
    const language = options.language ?? 'ar';
    const session = raw.treatmentSession;

    return new AppointmentListItemDto({
      id: raw.id,
      patientId: raw.patientId,
      type: raw.type,
      status: raw.status,
      scheduledAt: raw.scheduledAt,
      durationMinutes: raw.durationMinutes,
      isWaiting: raw.isWaiting,
      reasonForVisit: raw.reasonForVisit,
      treatmentSessionName: session
        ? pickLocalized(session.titleAr, session.titleEn, language)
        : null,
      treatmentPlanName: this.adaptTreatmentPlanName(
        session?.treatmentPlan ?? null,
        language,
      ),
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

  private adaptTreatmentPlanName(
    treatmentPlan: NonNullable<
      RawAppointmentListItem['treatmentSession']
    >['treatmentPlan'] | null,
    language: Language,
  ): string | null {
    if (!treatmentPlan) {
      return null;
    }

    if (treatmentPlan.template) {
      return pickLocalized(
        treatmentPlan.template.nameAr,
        treatmentPlan.template.nameEn,
        language,
      );
    }

    const localized = pickLocalized(
      treatmentPlan.nameAr ?? '',
      treatmentPlan.nameEn ?? '',
      language,
    ).trim();

    return localized || null;
  }
}
