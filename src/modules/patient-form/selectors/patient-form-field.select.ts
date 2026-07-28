import { Prisma } from '@prisma/client';

export const patientFormFieldSelect = () => {
  return Prisma.validator<Prisma.PatientFormFieldDefinitionSelect>()({
    id: true,
    key: true,
    labelAr: true,
    labelEn: true,
    type: true,
    required: true,
    validation: true,
    options: true,
    displayOrder: true,
    isActive: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
  });
};

export type RawPatientFormFieldSelect = Prisma.PatientFormFieldDefinitionGetPayload<{
  select: ReturnType<typeof patientFormFieldSelect>;
}>;