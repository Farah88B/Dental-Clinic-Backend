import { Prisma } from '@prisma/client';
import { treatmentSessionSelect } from 'src/modules/treatment-sessions/selectors/treatment-session.select';

const treatmentPlanTemplateSummarySelect = () => {
  return Prisma.validator<Prisma.TreatmentPlanTemplateSelect>()({
    id: true,
    nameAr: true,
    nameEn: true,
  });
};

export const treatmentPlanSelect = () => {
  return Prisma.validator<Prisma.TreatmentPlanSelect>()({
    id: true,
    patientId: true,
    createdByAccountId: true,
    templateId: true,
    nameAr: true,
    nameEn: true,
    template: {
      select: treatmentPlanTemplateSummarySelect(),
    },
    status: true,
    estimatedCost: true,
    actualCost: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    sessions: {
      orderBy: { sessionOrder: 'asc' },
      select: treatmentSessionSelect(),
    },
  });
};

export type RawTreatmentPlanSelect = Prisma.TreatmentPlanGetPayload<{
  select: ReturnType<typeof treatmentPlanSelect>;
}>;
