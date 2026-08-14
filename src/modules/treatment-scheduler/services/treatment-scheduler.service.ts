import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TreatmentSessionStatus } from '@prisma/client';
import { NOTIFICATION_TYPES } from 'src/common/constants/notification.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { NotificationRecipientService } from 'src/modules/notification/services/notification-recipient.service';
import { ACTIVE_APPOINTMENT_STATUSES } from 'src/modules/treatment-sessions/helpers/session-flags.helper';

/**
 * Sends P8 reminders when a PENDING session's booking window opens.
 * Status is not changed — canBook is computed on read.
 */
@Injectable()
export class TreatmentSchedulerService {
  private readonly logger = new Logger(TreatmentSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: NotificationRecipientService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async remindSessionsAvailableForBooking(): Promise<void> {
    await this.notifyBookableSessions();
  }

  async notifyBookableSessions(): Promise<number> {
    const now = new Date();

    const sessions = await this.prisma.treatmentSession.findMany({
      where: {
        status: TreatmentSessionStatus.PENDING,
        availableForBookingAt: { lte: now },
        treatmentPlan: {
          patient: { accountId: { not: null } },
        },
      },
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        treatmentPlan: {
          select: {
            patientId: true,
            patient: { select: { accountId: true } },
          },
        },
      },
    });

    let sent = 0;
    for (const session of sessions) {
      const accountId = session.treatmentPlan.patient.accountId;
      if (accountId == null) {
        continue;
      }

      const activeAppointment = await this.prisma.appointment.findFirst({
        where: {
          treatmentSessionId: session.id,
          status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
        },
        select: { id: true },
      });
      if (activeAppointment) {
        continue;
      }

      const alreadySent = await this.recipients.hasSentNotification(
        accountId,
        NOTIFICATION_TYPES.TREATMENT_SESSION_BOOKABLE,
        { treatmentSessionId: session.id },
      );
      if (alreadySent) {
        continue;
      }

      try {
        await this.recipients.notifyPatientByPatientId(
          session.treatmentPlan.patientId,
          {
            type: NOTIFICATION_TYPES.TREATMENT_SESSION_BOOKABLE,
            titleAr: 'جلسة علاج جاهزة للحجز',
            titleEn: 'Treatment session ready to book',
            bodyAr: `يمكنك الآن حجز جلسة "${session.titleAr}".`,
            bodyEn: `You can now book session "${session.titleEn}".`,
            data: {
              treatmentSessionId: session.id,
              patientId: session.treatmentPlan.patientId,
            },
          },
        );
        sent += 1;
      } catch (error) {
        this.logger.warn({
          treatmentSessionId: session.id,
          error: error instanceof Error ? error.message : String(error),
          msg: 'Treatment session bookable notification failed',
        });
      }
    }

    return sent;
  }
}
