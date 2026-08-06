import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentStatus, TreatmentSessionStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import {
  clinicLocalToUtc,
  getClinicTodayDateOnly,
} from 'src/modules/clinic-schedule/helpers/clinic-timezone.helper';

const NO_SHOW_ELIGIBLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING_CONFIRMATION,
  AppointmentStatus.CONFIRMED,
];

/**
 * EC-2: after the clinic calendar day ends, appointments that never reached
 * check-in become NO_SHOW; linked BOOKED sessions return to PENDING for rebooking.
 */
@Injectable()
export class AppointmentNoShowScheduler {
  private readonly logger = new Logger(AppointmentNoShowScheduler.name);
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.timeZone =
      this.configService.get<string>('clinic.timezone') ?? 'Asia/Damascus';
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    await this.markPastAppointmentsAsNoShow();
  }

  async markPastAppointmentsAsNoShow(): Promise<number> {
    const today = getClinicTodayDateOnly(this.timeZone);
    const dayStart = clinicLocalToUtc(
      today.getUTCFullYear(),
      today.getUTCMonth() + 1,
      today.getUTCDate(),
      0,
      this.timeZone,
    );

    const candidates = await this.prisma.appointment.findMany({
      where: {
        status: { in: NO_SHOW_ELIGIBLE_STATUSES },
        scheduledAt: { lt: dayStart },
      },
      select: {
        id: true,
        treatmentSessionId: true,
      },
    });

    if (candidates.length === 0) {
      return 0;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const appointment of candidates) {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: AppointmentStatus.NO_SHOW },
        });

        if (appointment.treatmentSessionId == null) {
          continue;
        }

        const session = await tx.treatmentSession.findUnique({
          where: { id: appointment.treatmentSessionId },
          select: { id: true, status: true },
        });

        if (session?.status === TreatmentSessionStatus.BOOKED) {
          await tx.treatmentSession.update({
            where: { id: session.id },
            data: { status: TreatmentSessionStatus.PENDING },
          });
        }
      }
    });

    this.logger.log(
      `Marked ${candidates.length} appointment(s) as NO_SHOW (before ${dayStart.toISOString()})`,
    );

    return candidates.length;
  }
}
