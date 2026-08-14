import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { AppointmentNotificationService } from './appointment-notification.service';

const REMINDER_WINDOWS_HOURS = [24, 2] as const;
const REMINDER_WINDOW_MINUTES = 10;

@Injectable()
export class AppointmentReminderScheduler {
  private readonly logger = new Logger(AppointmentReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentNotifications: AppointmentNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron(): Promise<void> {
    for (const hours of REMINDER_WINDOWS_HOURS) {
      await this.sendRemindersForWindow(hours);
    }
  }

  async sendRemindersForWindow(hours: 24 | 2): Promise<number> {
    const now = Date.now();
    const targetMs = hours * 60 * 60 * 1000;
    const halfWindowMs = (REMINDER_WINDOW_MINUTES / 2) * 60 * 1000;
    const from = new Date(now + targetMs - halfWindowMs);
    const to = new Date(now + targetMs + halfWindowMs);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: { gte: from, lte: to },
        patient: { accountId: { not: null } },
      },
      select: {
        id: true,
        patientId: true,
        scheduledAt: true,
        patient: { select: { accountId: true } },
      },
    });

    let sent = 0;
    for (const appointment of appointments) {
      const accountId = appointment.patient.accountId;
      if (accountId == null) {
        continue;
      }
      try {
        await this.appointmentNotifications.sendReminder(
          {
            id: appointment.id,
            patientId: appointment.patientId,
            scheduledAt: appointment.scheduledAt,
            patientAccountId: accountId,
          },
          hours,
        );
        sent += 1;
      } catch (error) {
        this.logger.warn({
          appointmentId: appointment.id,
          reminderHours: hours,
          error: error instanceof Error ? error.message : String(error),
          msg: 'Appointment reminder failed',
        });
      }
    }

    return sent;
  }
}
