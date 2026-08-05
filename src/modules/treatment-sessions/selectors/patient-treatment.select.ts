import { Prisma } from '@prisma/client';

export const patientTreatmentMediaFileSelect = () => {
  return Prisma.validator<Prisma.MediaFileSelect>()({
    id: true,
    path: true,
    originalName: true,
    mimeType: true,
    category: true,
  });
};

export const patientMedicalAttachmentSelect = () => {
  return Prisma.validator<Prisma.MedicalAttachmentSelect>()({
    id: true,
    type: true,
    title: true,
    createdAt: true,
    mediaFile: { select: patientTreatmentMediaFileSelect() },
  });
};

export const patientTreatmentEncounterSelect = () => {
  return Prisma.validator<Prisma.EncounterSelect>()({
    id: true,
    diagnosis: true,
    clinicalNotes: true,
    prescription: true,
    attachments: {
      select: patientMedicalAttachmentSelect(),
      orderBy: { createdAt: 'desc' },
    },
  });
};

export const patientTreatmentTemplateSummarySelect = () => {
  return Prisma.validator<Prisma.TreatmentPlanTemplateSelect>()({
    nameAr: true,
    nameEn: true,
  });
};

export const patientTreatmentSessionSelect = () => {
  return Prisma.validator<Prisma.TreatmentSessionSelect>()({
    id: true,
    treatmentPlanId: true,
    sessionOrder: true,
    titleAr: true,
    titleEn: true,
    status: true,
    durationMinutes: true,
    estimatedCost: true,
    availableForBookingAt: true,
    completedAt: true,
    rating: true,
    appointments: {
      select: { id: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    },
    encounter: {
      select: patientTreatmentEncounterSelect(),
    },
  });
};

/** Cross-plan list: session + plan template names + sibling statuses for canBook. */
export const patientTreatmentSessionListSelect = () => {
  return Prisma.validator<Prisma.TreatmentSessionSelect>()({
    ...patientTreatmentSessionSelect(),
    treatmentPlan: {
      select: {
        id: true,
        template: { select: patientTreatmentTemplateSummarySelect() },
        sessions: {
          select: { id: true, sessionOrder: true, status: true },
          orderBy: { sessionOrder: 'asc' },
        },
      },
    },
  });
};

/** Plan list summary: statuses only for progress/sessionCount. */
export const patientTreatmentPlanSummarySelect = () => {
  return Prisma.validator<Prisma.TreatmentPlanSelect>()({
    id: true,
    patientId: true,
    status: true,
    estimatedCost: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    nameAr: true,
    nameEn: true,
    template: { select: patientTreatmentTemplateSummarySelect() },
    sessions: {
      select: { status: true },
    },
  });
};

/** Plan detail with full nested sessions (no treatmentPlanId needed in response). */
export const patientTreatmentPlanDetailSelect = () => {
  return Prisma.validator<Prisma.TreatmentPlanSelect>()({
    id: true,
    patientId: true,
    status: true,
    estimatedCost: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    nameAr: true,
    nameEn: true,
    template: { select: patientTreatmentTemplateSummarySelect() },
    sessions: {
      select: {
        id: true,
        sessionOrder: true,
        titleAr: true,
        titleEn: true,
        status: true,
        durationMinutes: true,
        estimatedCost: true,
        availableForBookingAt: true,
        completedAt: true,
        rating: true,
        appointments: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' as const },
        },
        encounter: {
          select: patientTreatmentEncounterSelect(),
        },
      },
      orderBy: { sessionOrder: 'asc' },
    },
  });
};

export const patientTreatmentPlanSessionFilesSelect = () => {
  return Prisma.validator<Prisma.TreatmentPlanSelect>()({
    sessions: {
      orderBy: { sessionOrder: 'asc' },
      select: {
        id: true,
        sessionOrder: true,
        titleAr: true,
        titleEn: true,
        encounter: {
          select: {
            prescription: true,
            attachments: {
              select: patientMedicalAttachmentSelect(),
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    },
  });
};
