import { Prisma } from '@prisma/client';

export const patientSelect = () => {
  return Prisma.validator<Prisma.PatientSelect>()({
    id: true,
    medicalRecordNumber: true,
    fullName: true,
    birthDate: true,
    gender: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    formValues: {
      select: {
        value: true,
        fieldDefinition: {
          select: { key: true },
        },
      },
    },
  });
};

export const patientFormDefinitionSelect = () => {
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
  });
};

export type RawPatient = Prisma.PatientGetPayload<{
  select: ReturnType<typeof patientSelect>;
}>;

export type RawPatientFormDefinition = Prisma.PatientFormFieldDefinitionGetPayload<{
  select: ReturnType<typeof patientFormDefinitionSelect>;
}>;
