import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import DEFAULT_TREATMENT_TEMPLATES from './templates.data.json';

interface SeedSession {
  titleAr: string;
  titleEn: string;
  sessionOrder: number;
  durationMinutes?: number;
  minDaysBeforeBooking?: number;
  estimatedCost: number;
}

interface SeedTemplate {
  nameAr: string;
  nameEn: string;
  sessions: SeedSession[];
}

const FIRST_VISIT_SESSION: SeedSession = {
  titleAr: 'زيارة أولى (استشارة)',
  titleEn: 'First Visit (Consultation)',
  sessionOrder: 1,
  estimatedCost: 0,
};

/**
 * Seeds sample TreatmentPlanTemplate + TreatmentSessionTemplate rows.
 * Idempotent via findFirst on nameAr+nameEn before create.
 *
 * If a template's sessions array has no sessionOrder=1 entry, a default
 * "First Visit (Consultation)" session is prepended automatically.
 */
export async function upsertDefaultTreatmentTemplates(prisma: PrismaService) {
  const templates = DEFAULT_TREATMENT_TEMPLATES as SeedTemplate[];

  for (const template of templates) {
    const existing = await prisma.treatmentPlanTemplate.findFirst({
      where: {
        nameAr: template.nameAr,
        nameEn: template.nameEn,
      },
    });

    if (existing) {
      continue;
    }

    const sessions = ensureFirstVisitSession([...template.sessions]);
    const estimatedCost = sessions.reduce(
      (sum, session) => sum + session.estimatedCost,
      0,
    );

    await prisma.treatmentPlanTemplate.create({
      data: {
        nameAr: template.nameAr,
        nameEn: template.nameEn,
        estimatedCost,
        sessionTemplates: {
          create: sessions.map((session) => ({
            titleAr: session.titleAr,
            titleEn: session.titleEn,
            sessionOrder: session.sessionOrder,
            durationMinutes: session.durationMinutes,
            minDaysBeforeBooking: session.minDaysBeforeBooking,
            estimatedCost: session.estimatedCost,
          })),
        },
      },
    });
  }
}

function ensureFirstVisitSession(sessions: SeedSession[]): SeedSession[] {
  const hasOrderOne = sessions.some((session) => session.sessionOrder === 1);
  if (hasOrderOne) {
    return sessions.sort((a, b) => a.sessionOrder - b.sessionOrder);
  }
  return [FIRST_VISIT_SESSION, ...sessions].sort(
    (a, b) => a.sessionOrder - b.sessionOrder,
  );
}
