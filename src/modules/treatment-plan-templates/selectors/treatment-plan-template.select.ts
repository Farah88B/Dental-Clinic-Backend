import { Prisma } from '@prisma/client';
import { treatmentSessionTemplateSelect } from './treatment-session-template.select';

const planTemplateBaseSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  estimatedCost: true,
  createdByAccountId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Detail / getById — nested active session templates only. */
export const treatmentPlanTemplateSelect = () => {
  return Prisma.validator<Prisma.TreatmentPlanTemplateSelect>()({
    ...planTemplateBaseSelect,
    sessionTemplates: {
      where: { isActive: true },
      orderBy: { sessionOrder: 'asc' },
      select: treatmentSessionTemplateSelect(),
    },
  });
};

/** List — active session count only (no nested sessions). */
export const treatmentPlanTemplateListSelect = () => {
  return Prisma.validator<Prisma.TreatmentPlanTemplateSelect>()({
    ...planTemplateBaseSelect,
    _count: {
      select: {
        sessionTemplates: { where: { isActive: true } },
      },
    },
  });
};

export type RawTreatmentPlanTemplateSelect = Prisma.TreatmentPlanTemplateGetPayload<{
  select: ReturnType<typeof treatmentPlanTemplateSelect>;
}>;

export type RawTreatmentPlanTemplateListSelect = Prisma.TreatmentPlanTemplateGetPayload<{
  select: ReturnType<typeof treatmentPlanTemplateListSelect>;
}>;
