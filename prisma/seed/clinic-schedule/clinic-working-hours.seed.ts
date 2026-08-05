import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import DEFAULT_WORKING_HOURS from './clinic-working-hours.data.json';

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Seeds the weekly clinic working-hours template (7 rows).
 *
 * On conflict: does NOT overwrite times/breaks (update: {}) so an admin's
 * later schedule edits are never undone by re-running seed — same pattern as
 * clinic-settings.seed.ts.
 */
export async function upsertClinicWorkingHours(prisma: PrismaService) {
  for (const day of DEFAULT_WORKING_HOURS) {
    const isWorkingDay = day.isWorkingDay;
    const startMinute =
      isWorkingDay && day.startTime ? parseTimeToMinutes(day.startTime) : null;
    const endMinute =
      isWorkingDay && day.endTime ? parseTimeToMinutes(day.endTime) : null;

    await prisma.clinicWorkingHours.upsert({
      where: {
        dayOfWeek: day.dayOfWeek as DayOfWeek,
      },
      update: {},
      create: {
        dayOfWeek: day.dayOfWeek as DayOfWeek,
        isWorkingDay,
        startMinute,
        endMinute,
        breaks: day.breaks ?? [],
      },
    });
  }
}
