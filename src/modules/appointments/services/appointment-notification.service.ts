import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus } from '@prisma/client';
import { NOTIFICATION_TYPES } from 'src/common/constants/notification.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { formatNotificationDateTime } from 'src/modules/notification/helpers/notification-datetime.helper';
import { NotificationRecipientService } from 'src/modules/notification/services/notification-recipient.service';
import { RawAppointment } from '../selectors/appointment.select';
import { AppointmentBookingAccess } from './appointment-availability.service';

@Injectable()
export class AppointmentNotificationService {
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: NotificationRecipientService,
    private readonly configService: ConfigService,
  ) {
    this.timeZone =
      this.configService.get<string>('clinic.timezone') ?? 'Asia/Damascus';
  }

  async onCreated(
    appointment: RawAppointment,
    access: AppointmentBookingAccess,
  ): Promise<void> {
    const patient = await this.loadPatient(appointment.patientId);
    const datetimeAr = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'ar',
    );
    const datetimeEn = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'en',
    );

    if (access.source === 'APP') {
      if (appointment.status === AppointmentStatus.PENDING_CONFIRMATION) {
        await this.recipients.notifyPatientByPatientId(appointment.patientId, {
          type: NOTIFICATION_TYPES.APPOINTMENT_PENDING_CONFIRMATION,
          titleAr: 'موعد بانتظار التأكيد',
          titleEn: 'Appointment pending confirmation',
          bodyAr: `تم استلام طلب موعدك بتاريخ ${datetimeAr} وهو بانتظار تأكيد العيادة.`,
          bodyEn: `Your appointment request for ${datetimeEn} is pending clinic confirmation.`,
          data: { appointmentId: appointment.id, patientId: appointment.patientId },
        });
        await this.recipients.notifyStaff({
          type: NOTIFICATION_TYPES.APPOINTMENT_PENDING_STAFF,
          titleAr: 'طلب موعد جديد',
          titleEn: 'New appointment request',
          bodyAr: `طلب موعد من ${patient.fullName} بتاريخ ${datetimeAr}.`,
          bodyEn: `New appointment request from ${patient.fullName} for ${datetimeEn}.`,
          data: { appointmentId: appointment.id, patientId: appointment.patientId },
        });
      } else if (appointment.status === AppointmentStatus.CONFIRMED) {
        await this.notifyPatientConfirmed(appointment, datetimeAr, datetimeEn);
      }
      return;
    }

    if (appointment.status === AppointmentStatus.CONFIRMED) {
      await this.notifyPatientConfirmed(appointment, datetimeAr, datetimeEn);
    }

    if (appointment.isWaiting) {
      await this.recipients.notifyStaff({
        type: NOTIFICATION_TYPES.APPOINTMENT_WAITING,
        titleAr: 'مريض في قائمة الانتظار',
        titleEn: 'Patient on waiting list',
        bodyAr: `${patient.fullName} أُضيف إلى قائمة الانتظار لموعد ${datetimeAr}.`,
        bodyEn: `${patient.fullName} was added to the waiting list for ${datetimeEn}.`,
        data: { appointmentId: appointment.id, patientId: appointment.patientId },
      });
    }
  }

  async onConfirmed(appointment: RawAppointment): Promise<void> {
    const datetimeAr = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'ar',
    );
    const datetimeEn = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'en',
    );
    await this.notifyPatientConfirmed(appointment, datetimeAr, datetimeEn);
  }

  async onCancelled(
    appointment: RawAppointment,
    access: AppointmentBookingAccess,
  ): Promise<void> {
    const datetimeAr = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'ar',
    );
    const datetimeEn = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'en',
    );

    if (access.source === 'APP') {
      const patient = await this.loadPatient(appointment.patientId);
      await this.recipients.notifyStaff({
        type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED_BY_PATIENT,
        titleAr: 'إلغاء موعد من المريض',
        titleEn: 'Appointment cancelled by patient',
        bodyAr: `ألغى ${patient.fullName} موعده بتاريخ ${datetimeAr}.`,
        bodyEn: `${patient.fullName} cancelled their appointment for ${datetimeEn}.`,
        data: { appointmentId: appointment.id, patientId: appointment.patientId },
      });
      return;
    }

    await this.recipients.notifyPatientByPatientId(appointment.patientId, {
      type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED,
      titleAr: 'تم إلغاء الموعد',
      titleEn: 'Appointment cancelled',
      bodyAr: `تم إلغاء موعدك بتاريخ ${datetimeAr}.`,
      bodyEn: `Your appointment for ${datetimeEn} has been cancelled.`,
      data: { appointmentId: appointment.id, patientId: appointment.patientId },
    });
  }

  async onRescheduled(
    appointment: RawAppointment,
    access: AppointmentBookingAccess,
  ): Promise<void> {
    const datetimeAr = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'ar',
    );
    const datetimeEn = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'en',
    );

    if (access.source === 'APP') {
      const patient = await this.loadPatient(appointment.patientId);
      await this.recipients.notifyStaff({
        type: NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED_BY_PATIENT,
        titleAr: 'إعادة جدولة من المريض',
        titleEn: 'Appointment rescheduled by patient',
        bodyAr: `أعاد ${patient.fullName} جدولة موعده إلى ${datetimeAr}.`,
        bodyEn: `${patient.fullName} rescheduled their appointment to ${datetimeEn}.`,
        data: { appointmentId: appointment.id, patientId: appointment.patientId },
      });
      return;
    }

    await this.recipients.notifyPatientByPatientId(appointment.patientId, {
      type: NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED,
      titleAr: 'تم إعادة جدولة الموعد',
      titleEn: 'Appointment rescheduled',
      bodyAr: `تمت إعادة جدولة موعدك إلى ${datetimeAr}.`,
      bodyEn: `Your appointment has been rescheduled to ${datetimeEn}.`,
      data: { appointmentId: appointment.id, patientId: appointment.patientId },
    });
  }

  async onCheckedInFromApp(appointmentId: number): Promise<void> {
    const appointment = await this.prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        scheduledAt: true,
        patient: { select: { fullName: true } },
      },
    });

    const datetimeAr = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'ar',
    );
    const datetimeEn = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'en',
    );

    await this.recipients.notifyStaff({
      type: NOTIFICATION_TYPES.APPOINTMENT_CHECKED_IN,
      titleAr: 'تسجيل حضور مريض',
      titleEn: 'Patient checked in',
      bodyAr: `سجّل ${appointment.patient.fullName} حضوره لموعد ${datetimeAr}.`,
      bodyEn: `${appointment.patient.fullName} checked in for their appointment at ${datetimeEn}.`,
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
      },
    });
  }

  async sendReminder(
    appointment: {
      id: number;
      patientId: number;
      scheduledAt: Date;
      patientAccountId: number;
    },
    reminderHours: 24 | 2,
  ): Promise<void> {
    const alreadySent = await this.recipients.hasSentNotification(
      appointment.patientAccountId,
      NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      { appointmentId: appointment.id, reminderHours },
    );
    if (alreadySent) {
      return;
    }

    const datetimeAr = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'ar',
    );
    const datetimeEn = formatNotificationDateTime(
      appointment.scheduledAt,
      this.timeZone,
      'en',
    );
    const hoursLabelAr = reminderHours === 24 ? '24 ساعة' : 'ساعتين';
    const hoursLabelEn = reminderHours === 24 ? '24 hours' : '2 hours';

    await this.recipients.notifyPatientByPatientId(appointment.patientId, {
      type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      titleAr: 'تذكير بالموعد',
      titleEn: 'Appointment reminder',
      bodyAr: `تذكير: موعدك بعد ${hoursLabelAr} (${datetimeAr}).`,
      bodyEn: `Reminder: your appointment is in ${hoursLabelEn} (${datetimeEn}).`,
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        reminderHours,
      },
    });
  }

  private async notifyPatientConfirmed(
    appointment: RawAppointment,
    datetimeAr: string,
    datetimeEn: string,
  ): Promise<void> {
    await this.recipients.notifyPatientByPatientId(appointment.patientId, {
      type: NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
      titleAr: 'تأكيد الموعد',
      titleEn: 'Appointment confirmed',
      bodyAr: `تم تأكيد موعدك بتاريخ ${datetimeAr}.`,
      bodyEn: `Your appointment is confirmed for ${datetimeEn}.`,
      data: { appointmentId: appointment.id, patientId: appointment.patientId },
    });
  }

  private loadPatient(patientId: number) {
    return this.prisma.patient.findUniqueOrThrow({
      where: { id: patientId },
      select: { fullName: true },
    });
  }
}
