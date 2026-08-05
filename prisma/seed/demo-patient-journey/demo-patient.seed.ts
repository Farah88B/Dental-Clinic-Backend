import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import {
  AccountStatus,
  AppointmentStatus,
  AppointmentType,
  EncounterStatus,
  Gender,
  MediaFileCategory,
  MedicalAttachmentType,
  PatientStatus,
  TreatmentPlanStatus,
  TreatmentSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import { TREATMENT_CONSTANTS } from '../../../src/common/constants/treatment.constants';

/**
 * Demo patient — three plans (August 2026 timeline).
 *
 * Login patient: 0944444444 / 12345678  (MRN900001)
 * Login doctor:  0999999999 / 12345678
 *
 * Media (optional) under uploads/:
 *   xrays/demo-xray-s2.jpg, reports/demo-report-s2.pdf,
 *   other/demo-photo-before.jpg, other/demo-photo-after.jpg
 *
 * Plan A ACTIVE (3 sessions — manual titles, marker on S2):
 *   1 COMPLETED + rated + actualCost 0
 *   2 COMPLETED unrated (~1h ago) + actualCost 165000 + media
 *   3 PENDING — canBook today
 *
 * Plan B ACTIVE (Root Canal template — marker on S2):
 *   1 BOOKED + CONFIRMED appt — canTreat
 *   2 PENDING — canBook true
 *   3 PENDING — canBook false
 *
 * Plan C COMPLETED (Teeth Whitening template — marker on S2):
 *   1–3 all COMPLETED + rated + actualCost (filter ?status=COMPLETED)
 */
const DEMO_PLAN_A_S2_TITLE = 'Demo Plan A — Canal Cleaning';
const DEMO_PLAN_B_S2_TITLE = 'Demo Plan B — Template Pending Second';
const DEMO_PLAN_C_S2_TITLE = 'Demo Plan C — Completed Whitening Mid';
/** Legacy single-plan marker — trimmed to Plan A on re-seed. */
const LEGACY_PLAN_S2_TITLE = 'Demo Root Canal Session';

const SEED_MEDIA = {
  xray: {
    relativePath: 'xrays/demo-xray-s2.jpg',
    category: MediaFileCategory.XRAY,
    mimeType: 'image/jpeg',
  },
  report: {
    relativePath: 'reports/demo-report-s2.pdf',
    category: MediaFileCategory.REPORT,
    mimeType: 'application/pdf',
  },
  photoBefore: {
    relativePath: 'other/demo-photo-before.jpg',
    category: MediaFileCategory.OTHER,
    mimeType: 'image/jpeg',
  },
  photoAfter: {
    relativePath: 'other/demo-photo-after.jpg',
    category: MediaFileCategory.OTHER,
    mimeType: 'image/jpeg',
  },
} as const;

function uploadsRoot(): string {
  return path.resolve(process.cwd(), process.env.MEDIA_UPLOAD_ROOT ?? 'uploads');
}

async function registerMediaIfPresent(
  prisma: PrismaService,
  spec: { relativePath: string; category: MediaFileCategory; mimeType: string },
  uploadedByAccountId?: number | null,
) {
  const abs = path.join(uploadsRoot(), spec.relativePath);
  if (!fs.existsSync(abs)) {
    console.warn(`[seed] missing ${spec.relativePath} under uploads/ — skip media link`);
    return null;
  }

  const stat = fs.statSync(abs);
  const storedName = path.basename(spec.relativePath);

  const existing = await prisma.mediaFile.findFirst({
    where: { path: spec.relativePath },
  });
  if (existing) {
    return existing;
  }

  return prisma.mediaFile.create({
    data: {
      originalName: storedName,
      storedName,
      path: spec.relativePath,
      mimeType: spec.mimeType,
      size: stat.size,
      category: spec.category,
      uploadedByAccountId: uploadedByAccountId ?? null,
    },
  });
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addHours(base: Date, hours: number): Date {
  const d = new Date(base);
  d.setHours(d.getHours() + hours);
  return d;
}

function startOfDay(base: Date): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Fixed August anchor for readable QA (year/month); day follows seed run day. */
function augustDate(day: number, hour = 10, minute = 0): Date {
  return new Date(2026, 7, day, hour, minute, 0, 0);
}

export async function upsertDemoPatientJourney(prisma: PrismaService) {
  const patientRole = await prisma.role.findUnique({ where: { code: 'PATIENT' } });
  if (!patientRole) {
    throw new Error('PATIENT role not found — seed roles first');
  }

  const doctor = await prisma.account.findUnique({
    where: { phone: '0999999999' },
  });

  const clinicSettings = await prisma.clinicSettings.findFirst();
  const defaultDuration = clinicSettings?.defaultConsultationDurationMinutes ?? 30;

  const hashedPassword = await bcrypt.hash('12345678', 12);

  const account = await prisma.account.upsert({
    where: { phone: '0944444444' },
    update: {
      password: hashedPassword,
      status: AccountStatus.ACTIVE,
      phoneVerifiedAt: new Date(),
    },
    create: {
      phone: '0944444444',
      password: hashedPassword,
      status: AccountStatus.ACTIVE,
      phoneVerifiedAt: new Date(),
    },
  });

  await prisma.accountRole.upsert({
    where: {
      accountId_roleId: { accountId: account.id, roleId: patientRole.id },
    },
    update: {},
    create: { accountId: account.id, roleId: patientRole.id },
  });

  let patient = await prisma.patient.findFirst({
    where: { medicalRecordNumber: 'MRN900001' },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        accountId: account.id,
        medicalRecordNumber: 'MRN900001',
        fullName: 'مريض تجريبي — رحلة العلاج',
        birthDate: new Date('1995-05-15'),
        gender: Gender.MALE,
        status: PatientStatus.ACTIVE,
      },
    });
  } else if (patient.accountId !== account.id) {
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: { accountId: account.id },
    });
  }

  const now = new Date();
  const augDay = now.getMonth() === 7 && now.getFullYear() === 2026 ? now.getDate() : 5;

  /** Plan A — August timeline */
  const a1CompletedAt = augustDate(15, 11, 0);
  const a2CompletedAt = addHours(now, -1);
  const a2AvailableAt = addDays(a1CompletedAt, 7);
  const a3AvailableAt = startOfDay(augustDate(augDay));

  /** Plan B — template booking lab */
  const b1AvailableAt = startOfDay(augustDate(Math.max(1, augDay - 1)));
  const b1ScheduledAt = augustDate(Math.min(28, augDay + 1), 11, 0);
  const b2AvailableAt = startOfDay(augustDate(augDay));
  const b3AvailableAt = startOfDay(augustDate(Math.min(28, augDay + 14)));

  /** Plan C — fully completed whitening (June → early July) */
  const c1CompletedAt = new Date(2026, 5, 10, 11, 0, 0, 0); // Jun 10
  const c2CompletedAt = new Date(2026, 5, 24, 11, 0, 0, 0); // Jun 24
  const c3CompletedAt = new Date(2026, 6, 8, 11, 0, 0, 0); // Jul 8

  await migrateLegacySevenSessionPlan(prisma, patient.id);

  const rootCanalTemplate = await prisma.treatmentPlanTemplate.findFirst({
    where: { nameEn: 'Root Canal Treatment', isActive: true },
    include: {
      sessionTemplates: {
        where: { isActive: true },
        orderBy: { sessionOrder: 'asc' },
      },
    },
  });

  const whiteningTemplate = await prisma.treatmentPlanTemplate.findFirst({
    where: { nameEn: 'Teeth Whitening', isActive: true },
    include: {
      sessionTemplates: {
        where: { isActive: true },
        orderBy: { sessionOrder: 'asc' },
      },
    },
  });

  const planA = await ensurePlanA(
    prisma,
    patient.id,
    doctor?.id ?? null,
    { a1CompletedAt, a2CompletedAt, a2AvailableAt, a3AvailableAt },
  );

  const planB = await ensurePlanB(
    prisma,
    patient.id,
    doctor?.id ?? null,
    rootCanalTemplate,
    { b1AvailableAt, b1ScheduledAt, b2AvailableAt, b3AvailableAt, now },
    defaultDuration,
  );

  const planC = await ensurePlanC(
    prisma,
    patient.id,
    doctor?.id ?? null,
    whiteningTemplate,
    { c1CompletedAt, c2CompletedAt, c3CompletedAt },
    defaultDuration,
  );

  await recalculateDemoPlanCosts(prisma, planA.id);
  await recalculateDemoPlanCosts(prisma, planB.id);
  await recalculateDemoPlanCosts(prisma, planC.id);

  await ensurePlanAAppointments(
    prisma,
    patient.id,
    planA.sessions,
    doctor?.id ?? null,
    defaultDuration,
    { a1CompletedAt, a2CompletedAt },
  );

  await ensurePlanBAppointments(
    prisma,
    patient.id,
    planB.sessions,
    doctor?.id ?? null,
    defaultDuration,
    { b1ScheduledAt, now },
  );

  await ensurePlanCAppointments(
    prisma,
    patient.id,
    planC.sessions,
    doctor?.id ?? null,
    defaultDuration,
    { c1CompletedAt, c2CompletedAt, c3CompletedAt },
  );

  await ensurePlanAEncountersAndMedia(
    prisma,
    planA.sessions,
    doctor?.id ?? null,
  );

  await ensureCompletedPlanEncounters(
    prisma,
    planC.sessions,
    doctor?.id ?? null,
    {
      1: 'استشارة تبييض — تقييم لون الأسنان',
      2: 'جلسة تبييض أولى مكتملة',
      3: 'جلسة تبييض ثانية — انتهاء الخطة',
    },
  );

  await ensureExtraStandaloneAppointments(
    prisma,
    patient.id,
    doctor?.id ?? null,
    defaultDuration,
    b1ScheduledAt,
  );
}

async function migrateLegacySevenSessionPlan(
  prisma: PrismaService,
  patientId: number,
) {
  const legacy = await prisma.treatmentPlan.findFirst({
    where: {
      patientId,
      isActive: true,
      sessions: {
        some: {
          titleEn: { in: [LEGACY_PLAN_S2_TITLE, DEMO_PLAN_A_S2_TITLE] },
        },
      },
    },
    include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
  });

  if (!legacy || legacy.sessions.length <= 3) {
    return;
  }

  const toRemove = legacy.sessions.filter((s) => s.sessionOrder > 3);
  for (const session of toRemove) {
    await prisma.appointment.deleteMany({
      where: { treatmentSessionId: session.id },
    });
    await prisma.encounter.deleteMany({
      where: { treatmentSessionId: session.id },
    });
    await prisma.treatmentSession.delete({ where: { id: session.id } });
  }

  const s2 = legacy.sessions.find((s) => s.sessionOrder === 2);
  if (s2 && s2.titleEn === LEGACY_PLAN_S2_TITLE) {
    await prisma.treatmentSession.update({
      where: { id: s2.id },
      data: { titleEn: DEMO_PLAN_A_S2_TITLE },
    });
  }
}

async function ensurePlanA(
  prisma: PrismaService,
  patientId: number,
  doctorId: number | null,
  dates: {
    a1CompletedAt: Date;
    a2CompletedAt: Date;
    a2AvailableAt: Date;
    a3AvailableAt: Date;
  },
) {
  const { a1CompletedAt, a2CompletedAt, a2AvailableAt, a3AvailableAt } = dates;

  const existing = await prisma.treatmentPlan.findFirst({
    where: {
      patientId,
      isActive: true,
      sessions: { some: { titleEn: DEMO_PLAN_A_S2_TITLE } },
    },
    include: {
      sessions: { orderBy: { sessionOrder: 'asc' }, include: { encounter: true } },
    },
  });

  if (existing) {
    const s1 = existing.sessions.find((s) => s.sessionOrder === 1);
    const s2 = existing.sessions.find((s) => s.sessionOrder === 2);
    const s3 = existing.sessions.find((s) => s.sessionOrder === 3);

    if (s1) {
      await prisma.treatmentSession.update({
        where: { id: s1.id },
        data: {
          status: TreatmentSessionStatus.COMPLETED,
          actualCost: 0,
          completedAt: a1CompletedAt,
          rating: 5,
          ratedAt: a1CompletedAt,
          availableForBookingAt: a1CompletedAt,
        },
      });
    }
    if (s2) {
      await prisma.treatmentSession.update({
        where: { id: s2.id },
        data: {
          titleEn: DEMO_PLAN_A_S2_TITLE,
          status: TreatmentSessionStatus.COMPLETED,
          completedAt: a2CompletedAt,
          rating: null,
          ratedAt: null,
          actualCost: 165000,
          availableForBookingAt: a2AvailableAt,
        },
      });
    }
    if (s3) {
      await prisma.treatmentSession.update({
        where: { id: s3.id },
        data: {
          status: TreatmentSessionStatus.PENDING,
          minDaysBeforeBooking: 7,
          availableForBookingAt: a3AvailableAt,
        },
      });
    }

    await prisma.treatmentPlan.update({
      where: { id: existing.id },
      data: {
        nameAr: 'خطة علاجية يدوية — خطة أ',
        nameEn: 'Manual Treatment Plan A',
      },
    });

    return prisma.treatmentPlan.findUniqueOrThrow({
      where: { id: existing.id },
      include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
    });
  }

  const plan = await prisma.treatmentPlan.create({
    data: {
      patientId,
      createdByAccountId: doctorId,
      templateId: null,
      nameAr: 'خطة علاجية يدوية — خطة أ',
      nameEn: 'Manual Treatment Plan A',
      status: TreatmentPlanStatus.ACTIVE,
      estimatedCost: 0,
      actualCost: 0,
      sessions: {
        create: [
          {
            titleAr: TREATMENT_CONSTANTS.CONSULTATION_TITLE_AR,
            titleEn: TREATMENT_CONSTANTS.CONSULTATION_TITLE_EN,
            sessionOrder: 1,
            durationMinutes: 30,
            estimatedCost: 0,
            actualCost: 0,
            status: TreatmentSessionStatus.COMPLETED,
            completedAt: a1CompletedAt,
            rating: 5,
            ratedAt: a1CompletedAt,
            availableForBookingAt: a1CompletedAt,
          },
          {
            titleAr: 'جلسة تنظيف القناة — خطة أ',
            titleEn: DEMO_PLAN_A_S2_TITLE,
            sessionOrder: 2,
            durationMinutes: 60,
            estimatedCost: 150000,
            actualCost: 165000,
            status: TreatmentSessionStatus.COMPLETED,
            completedAt: a2CompletedAt,
            availableForBookingAt: a2AvailableAt,
          },
          {
            titleAr: 'جلسة حشو القناة — خطة أ',
            titleEn: 'Demo Plan A — Canal Filling',
            sessionOrder: 3,
            durationMinutes: 45,
            estimatedCost: 120000,
            minDaysBeforeBooking: 7,
            status: TreatmentSessionStatus.PENDING,
            availableForBookingAt: a3AvailableAt,
          },
        ],
      },
    },
    include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
  });

  return plan;
}

async function ensurePlanB(
  prisma: PrismaService,
  patientId: number,
  doctorId: number | null,
  template: {
    id: number;
    sessionTemplates: Array<{
      titleAr: string;
      titleEn: string;
      sessionOrder: number;
      durationMinutes: number | null;
      minDaysBeforeBooking: number | null;
      estimatedCost: { toString(): string } | number;
    }>;
  } | null,
  dates: {
    b1AvailableAt: Date;
    b1ScheduledAt: Date;
    b2AvailableAt: Date;
    b3AvailableAt: Date;
    now: Date;
  },
  defaultDuration: number,
) {
  if (!template?.sessionTemplates.length) {
    throw new Error('Root Canal Treatment template not found — seed templates first');
  }

  const { b1AvailableAt, b1ScheduledAt, b2AvailableAt, b3AvailableAt } = dates;
  const tpl = template.sessionTemplates.slice(0, 3);

  const existing = await prisma.treatmentPlan.findFirst({
    where: {
      patientId,
      isActive: true,
      templateId: template.id,
      sessions: { some: { titleEn: DEMO_PLAN_B_S2_TITLE } },
    },
    include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
  });

  if (existing) {
    const byOrder = (n: number) => existing.sessions.find((s) => s.sessionOrder === n);
    const t1 = tpl[0];
    const t2 = tpl[1];
    const t3 = tpl[2];

    const s1 = byOrder(1);
    const s2 = byOrder(2);
    const s3 = byOrder(3);

    if (s1 && t1) {
      await prisma.treatmentSession.update({
        where: { id: s1.id },
        data: {
          titleAr: t1.titleAr,
          titleEn: t1.titleEn,
          durationMinutes: t1.durationMinutes ?? defaultDuration,
          minDaysBeforeBooking: t1.minDaysBeforeBooking ?? 0,
          estimatedCost: Number(t1.estimatedCost),
          status: TreatmentSessionStatus.BOOKED,
          availableForBookingAt: b1AvailableAt,
        },
      });
    }
    if (s2 && t2) {
      await prisma.treatmentSession.update({
        where: { id: s2.id },
        data: {
          titleAr: t2.titleAr,
          titleEn: DEMO_PLAN_B_S2_TITLE,
          durationMinutes: t2.durationMinutes ?? 60,
          minDaysBeforeBooking: t2.minDaysBeforeBooking ?? 0,
          estimatedCost: Number(t2.estimatedCost),
          status: TreatmentSessionStatus.PENDING,
          availableForBookingAt: b2AvailableAt,
        },
      });
    }
    if (s3 && t3) {
      await prisma.treatmentSession.update({
        where: { id: s3.id },
        data: {
          titleAr: t3.titleAr,
          titleEn: t3.titleEn,
          durationMinutes: t3.durationMinutes ?? 45,
          minDaysBeforeBooking: t3.minDaysBeforeBooking ?? 14,
          estimatedCost: Number(t3.estimatedCost),
          status: TreatmentSessionStatus.PENDING,
          availableForBookingAt: b3AvailableAt,
        },
      });
    }

    return prisma.treatmentPlan.findUniqueOrThrow({
      where: { id: existing.id },
      include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
    });
  }

  const t1 = tpl[0];
  const t2 = tpl[1];
  const t3 = tpl[2];

  return prisma.treatmentPlan.create({
    data: {
      patientId,
      createdByAccountId: doctorId,
      templateId: template.id,
      status: TreatmentPlanStatus.ACTIVE,
      estimatedCost: 0,
      actualCost: 0,
      sessions: {
        create: [
          {
            titleAr: t1.titleAr,
            titleEn: t1.titleEn,
            sessionOrder: 1,
            durationMinutes: t1.durationMinutes ?? defaultDuration,
            minDaysBeforeBooking: t1.minDaysBeforeBooking ?? 0,
            estimatedCost: Number(t1.estimatedCost),
            status: TreatmentSessionStatus.BOOKED,
            availableForBookingAt: b1AvailableAt,
          },
          {
            titleAr: t2.titleAr,
            titleEn: DEMO_PLAN_B_S2_TITLE,
            sessionOrder: 2,
            durationMinutes: t2.durationMinutes ?? 60,
            minDaysBeforeBooking: t2.minDaysBeforeBooking ?? 0,
            estimatedCost: Number(t2.estimatedCost),
            status: TreatmentSessionStatus.PENDING,
            availableForBookingAt: b2AvailableAt,
          },
          {
            titleAr: t3.titleAr,
            titleEn: t3.titleEn,
            sessionOrder: 3,
            durationMinutes: t3.durationMinutes ?? 45,
            minDaysBeforeBooking: t3.minDaysBeforeBooking ?? 7,
            estimatedCost: Number(t3.estimatedCost),
            status: TreatmentSessionStatus.PENDING,
            availableForBookingAt: b3AvailableAt,
          },
        ],
      },
    },
    include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
  });
}

type TemplateWithSessions = {
  id: number;
  sessionTemplates: Array<{
    titleAr: string;
    titleEn: string;
    sessionOrder: number;
    durationMinutes: number | null;
    minDaysBeforeBooking: number | null;
    estimatedCost: { toString(): string } | number;
  }>;
} | null;

async function ensurePlanC(
  prisma: PrismaService,
  patientId: number,
  doctorId: number | null,
  template: TemplateWithSessions,
  dates: {
    c1CompletedAt: Date;
    c2CompletedAt: Date;
    c3CompletedAt: Date;
  },
  defaultDuration: number,
) {
  if (!template?.sessionTemplates.length) {
    throw new Error('Teeth Whitening template not found — seed templates first');
  }

  const { c1CompletedAt, c2CompletedAt, c3CompletedAt } = dates;
  const tpl = template.sessionTemplates.slice(0, 3);
  const t1 = tpl[0];
  const t2 = tpl[1];
  const t3 = tpl[2];

  const completedDefs = [
    {
      order: 1,
      tpl: t1,
      completedAt: c1CompletedAt,
      actualCost: 0,
      titleEn: t1.titleEn,
      rating: 5,
    },
    {
      order: 2,
      tpl: t2,
      completedAt: c2CompletedAt,
      actualCost: 155000,
      titleEn: DEMO_PLAN_C_S2_TITLE,
      rating: 4,
    },
    {
      order: 3,
      tpl: t3,
      completedAt: c3CompletedAt,
      actualCost: 105000,
      titleEn: t3.titleEn,
      rating: 5,
    },
  ] as const;

  const existing = await prisma.treatmentPlan.findFirst({
    where: {
      patientId,
      sessions: { some: { titleEn: DEMO_PLAN_C_S2_TITLE } },
    },
    include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
  });

  if (existing) {
    await prisma.treatmentPlan.update({
      where: { id: existing.id },
      data: {
        status: TreatmentPlanStatus.COMPLETED,
        templateId: template.id,
        isActive: true,
      },
    });

    for (const def of completedDefs) {
      const session = existing.sessions.find((s) => s.sessionOrder === def.order);
      if (!session || !def.tpl) continue;

      await prisma.treatmentSession.update({
        where: { id: session.id },
        data: {
          titleAr: def.tpl.titleAr,
          titleEn: def.titleEn,
          durationMinutes: def.tpl.durationMinutes ?? defaultDuration,
          minDaysBeforeBooking: def.tpl.minDaysBeforeBooking ?? 0,
          estimatedCost: Number(def.tpl.estimatedCost),
          actualCost: def.actualCost,
          status: TreatmentSessionStatus.COMPLETED,
          completedAt: def.completedAt,
          rating: def.rating,
          ratedAt: def.completedAt,
          availableForBookingAt: def.completedAt,
        },
      });
    }

    return prisma.treatmentPlan.findUniqueOrThrow({
      where: { id: existing.id },
      include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
    });
  }

  return prisma.treatmentPlan.create({
    data: {
      patientId,
      createdByAccountId: doctorId,
      templateId: template.id,
      status: TreatmentPlanStatus.COMPLETED,
      estimatedCost: 0,
      actualCost: 0,
      sessions: {
        create: completedDefs.map((def) => ({
          titleAr: def.tpl.titleAr,
          titleEn: def.titleEn,
          sessionOrder: def.order,
          durationMinutes: def.tpl.durationMinutes ?? defaultDuration,
          minDaysBeforeBooking: def.tpl.minDaysBeforeBooking ?? 0,
          estimatedCost: Number(def.tpl.estimatedCost),
          actualCost: def.actualCost,
          status: TreatmentSessionStatus.COMPLETED,
          completedAt: def.completedAt,
          rating: def.rating,
          ratedAt: def.completedAt,
          availableForBookingAt: def.completedAt,
        })),
      },
    },
    include: { sessions: { orderBy: { sessionOrder: 'asc' } } },
  });
}

async function ensurePlanAEncountersAndMedia(
  prisma: PrismaService,
  sessions: { id: number; sessionOrder: number; status: TreatmentSessionStatus }[],
  doctorId: number | null,
) {
  const emptyTeeth = Array.from({ length: TREATMENT_CONSTANTS.TEETH_COUNT }, (_, i) => ({
    index: i + 1,
    value: null,
  }));

  for (const session of sessions.filter(
    (s) => s.status === TreatmentSessionStatus.COMPLETED,
  )) {
    let encounter = await prisma.encounter.findUnique({
      where: { treatmentSessionId: session.id },
    });

    if (!encounter) {
      encounter = await prisma.encounter.create({
        data: {
          treatmentSessionId: session.id,
          status: EncounterStatus.COMPLETED,
          diagnosis:
            session.sessionOrder === 1
              ? 'التهاب لب السن — يحتاج علاج قناة'
              : 'استمرار علاج القناة — تنظيف وتعقيم',
          clinicalNotes: 'ملاحظات سريرية تجريبية — خطة أ',
          prescription:
            session.sessionOrder === 2
              ? 'إيبوبروفين 400mg عند الحاجة × 3 أيام'
              : null,
          teeth: emptyTeeth,
        },
      });
    }

    if (session.sessionOrder === 2) {
      await ensureSession2Media(prisma, encounter.id, doctorId);
    }
  }
}

async function ensurePlanAAppointments(
  prisma: PrismaService,
  patientId: number,
  sessions: { id: number; sessionOrder: number }[],
  doctorId: number | null,
  durationMinutes: number,
  dates: { a1CompletedAt: Date; a2CompletedAt: Date },
) {
  const defs = [
    {
      order: 1,
      status: AppointmentStatus.COMPLETED,
      type: AppointmentType.CONSULTATION,
      scheduledAt: dates.a1CompletedAt,
      confirmedAt: dates.a1CompletedAt,
      checkedInAt: dates.a1CompletedAt,
      completedAt: dates.a1CompletedAt,
    },
    {
      order: 2,
      status: AppointmentStatus.COMPLETED,
      type: AppointmentType.FOLLOW_UP,
      scheduledAt: dates.a2CompletedAt,
      confirmedAt: dates.a2CompletedAt,
      checkedInAt: dates.a2CompletedAt,
      completedAt: dates.a2CompletedAt,
    },
  ];

  await upsertSessionAppointments(
    prisma,
    patientId,
    sessions,
    doctorId,
    durationMinutes,
    defs,
  );
}

async function ensurePlanBAppointments(
  prisma: PrismaService,
  patientId: number,
  sessions: { id: number; sessionOrder: number }[],
  doctorId: number | null,
  durationMinutes: number,
  dates: { b1ScheduledAt: Date; now: Date },
) {
  const defs = [
    {
      order: 1,
      status: AppointmentStatus.CONFIRMED,
      type: AppointmentType.FOLLOW_UP,
      scheduledAt: dates.b1ScheduledAt,
      confirmedAt: dates.now,
    },
  ];

  await upsertSessionAppointments(
    prisma,
    patientId,
    sessions,
    doctorId,
    durationMinutes,
    defs,
  );
}

async function ensurePlanCAppointments(
  prisma: PrismaService,
  patientId: number,
  sessions: { id: number; sessionOrder: number }[],
  doctorId: number | null,
  durationMinutes: number,
  dates: {
    c1CompletedAt: Date;
    c2CompletedAt: Date;
    c3CompletedAt: Date;
  },
) {
  const defs = [
    {
      order: 1,
      status: AppointmentStatus.COMPLETED,
      type: AppointmentType.CONSULTATION,
      scheduledAt: dates.c1CompletedAt,
      confirmedAt: dates.c1CompletedAt,
      checkedInAt: dates.c1CompletedAt,
      completedAt: dates.c1CompletedAt,
    },
    {
      order: 2,
      status: AppointmentStatus.COMPLETED,
      type: AppointmentType.FOLLOW_UP,
      scheduledAt: dates.c2CompletedAt,
      confirmedAt: dates.c2CompletedAt,
      checkedInAt: dates.c2CompletedAt,
      completedAt: dates.c2CompletedAt,
    },
    {
      order: 3,
      status: AppointmentStatus.COMPLETED,
      type: AppointmentType.FOLLOW_UP,
      scheduledAt: dates.c3CompletedAt,
      confirmedAt: dates.c3CompletedAt,
      checkedInAt: dates.c3CompletedAt,
      completedAt: dates.c3CompletedAt,
    },
  ];

  await upsertSessionAppointments(
    prisma,
    patientId,
    sessions,
    doctorId,
    durationMinutes,
    defs,
  );
}

async function ensureCompletedPlanEncounters(
  prisma: PrismaService,
  sessions: { id: number; sessionOrder: number; status: TreatmentSessionStatus }[],
  _doctorId: number | null,
  diagnosisByOrder: Record<number, string>,
) {
  const emptyTeeth = Array.from({ length: TREATMENT_CONSTANTS.TEETH_COUNT }, (_, i) => ({
    index: i + 1,
    value: null,
  }));

  for (const session of sessions.filter(
    (s) => s.status === TreatmentSessionStatus.COMPLETED,
  )) {
    const existing = await prisma.encounter.findUnique({
      where: { treatmentSessionId: session.id },
    });
    if (existing) continue;

    await prisma.encounter.create({
      data: {
        treatmentSessionId: session.id,
        status: EncounterStatus.COMPLETED,
        diagnosis: diagnosisByOrder[session.sessionOrder] ?? 'خطة مكتملة',
        clinicalNotes: 'ملاحظات سريرية — خطة مكتملة (Plan C)',
        teeth: emptyTeeth,
      },
    });
  }
}

async function upsertSessionAppointments(
  prisma: PrismaService,
  patientId: number,
  sessions: { id: number; sessionOrder: number }[],
  doctorId: number | null,
  durationMinutes: number,
  defs: Array<{
    order: number;
    status: AppointmentStatus;
    type: AppointmentType;
    scheduledAt: Date;
    confirmedAt?: Date;
    checkedInAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
  }>,
) {
  const byOrder = (n: number) => sessions.find((s) => s.sessionOrder === n);

  for (const def of defs) {
    const session = byOrder(def.order);
    if (!session) continue;

    const existing = await prisma.appointment.findFirst({
      where: { treatmentSessionId: session.id },
    });

    const data = {
      status: def.status,
      scheduledAt: def.scheduledAt,
      durationMinutes,
      confirmedAt: def.confirmedAt ?? null,
      checkedInAt: def.checkedInAt ?? null,
      completedAt: def.completedAt ?? null,
      cancelledAt: def.cancelledAt ?? null,
      cancellationReason: def.cancellationReason ?? null,
      confirmedById: def.confirmedAt ? doctorId : null,
      checkedInById: def.checkedInAt ? doctorId : null,
      cancelledById: def.cancelledAt ? doctorId : null,
    };

    if (existing) {
      await prisma.appointment.update({ where: { id: existing.id }, data });
      continue;
    }

    await prisma.appointment.create({
      data: {
        patientId,
        createdById: doctorId,
        treatmentSessionId: session.id,
        type: def.type,
        reasonForVisit: `موعد تجريبي — جلسة #${def.order}`,
        ...data,
      },
    });
  }
}

async function ensureExtraStandaloneAppointments(
  prisma: PrismaService,
  patientId: number,
  doctorId: number | null,
  defaultDuration: number,
  sampleScheduledAt: Date,
) {
  const hasPendingConfirm = await prisma.appointment.findFirst({
    where: {
      patientId,
      status: AppointmentStatus.PENDING_CONFIRMATION,
      isWaiting: true,
      treatmentSessionId: null,
    },
  });
  if (!hasPendingConfirm) {
    await prisma.appointment.create({
      data: {
        patientId,
        createdById: doctorId,
        type: AppointmentType.CONSULTATION,
        scheduledAt: sampleScheduledAt,
        durationMinutes: defaultDuration,
        status: AppointmentStatus.PENDING_CONFIRMATION,
        isWaiting: true,
        reasonForVisit: 'ألم مفاجئ — انتظار تأكيد',
      },
    });
  }

  const hasNoShow = await prisma.appointment.findFirst({
    where: { patientId, status: AppointmentStatus.NO_SHOW },
  });
  if (!hasNoShow) {
    await prisma.appointment.create({
      data: {
        patientId,
        createdById: doctorId,
        type: AppointmentType.FOLLOW_UP,
        scheduledAt: augustDate(1, 9, 0),
        durationMinutes: defaultDuration,
        status: AppointmentStatus.NO_SHOW,
        reasonForVisit: 'متابعة لم يحضر — أغسطس',
        notes: 'تاريخي NO_SHOW للتجربة',
      },
    });
  }
}

async function recalculateDemoPlanCosts(
  prisma: PrismaService,
  planId: number,
): Promise<void> {
  const [estimated, actual] = await Promise.all([
    prisma.treatmentSession.aggregate({
      where: { treatmentPlanId: planId },
      _sum: { estimatedCost: true },
    }),
    prisma.treatmentSession.aggregate({
      where: { treatmentPlanId: planId, actualCost: { not: null } },
      _sum: { actualCost: true },
    }),
  ]);

  await prisma.treatmentPlan.update({
    where: { id: planId },
    data: {
      estimatedCost: estimated._sum.estimatedCost ?? 0,
      actualCost: actual._sum.actualCost ?? 0,
    },
  });
}

async function ensureSession2Media(
  prisma: PrismaService,
  encounterId: number | undefined,
  doctorId: number | null,
) {
  if (!encounterId) return;

  const specs: Array<{
    key: keyof typeof SEED_MEDIA;
    type: MedicalAttachmentType;
    title: string;
  }> = [
    { key: 'xray', type: MedicalAttachmentType.XRAY, title: 'أشعة قبل العلاج' },
    { key: 'report', type: MedicalAttachmentType.REPORT, title: 'تقرير طبي' },
    { key: 'photoBefore', type: MedicalAttachmentType.PHOTO, title: 'صورة قبل' },
    { key: 'photoAfter', type: MedicalAttachmentType.PHOTO, title: 'صورة بعد' },
  ];

  for (const item of specs) {
    const media = await registerMediaIfPresent(prisma, SEED_MEDIA[item.key], doctorId);
    if (!media) continue;

    const exists = await prisma.medicalAttachment.findFirst({
      where: { encounterId, mediaFileId: media.id },
    });
    if (exists) continue;

    await prisma.medicalAttachment.create({
      data: {
        encounterId,
        mediaFileId: media.id,
        type: item.type,
        title: item.title,
      },
    });
  }
}
