import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TreatmentSessionStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';

/**
 * Formerly promoted PENDING → READY_TO_TREATMENT when availableForBookingAt <= now.
 * Status READY_TO_TREATMENT was removed; canBook is computed instead.
 * Cron kept as a stub for future booking-reminder notifications only.
 */
@Injectable()
export class TreatmentSchedulerService {
  private readonly logger = new Logger(TreatmentSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async remindSessionsAvailableForBooking(): Promise<void> {
    const now = new Date();

    // Stub: count PENDING sessions whose booking window has opened.
    // Do not change status — reminders only (notifier not wired yet).
    const count = await this.prisma.treatmentSession.count({
      where: {
        status: TreatmentSessionStatus.PENDING,
        availableForBookingAt: { lte: now },
      },
    });
/*
    if (count > 0) {
      this.logger.debug(
        `${count} PENDING session(s) past availableForBookingAt (reminder stub)`,
      );
    }
    */
  }
}
