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

export const patientMySelect = () => {
  return Prisma.validator<Prisma.PatientSelect>()({
    id: true,
    medicalRecordNumber: true,
    fullName: true,
    birthDate: true,
    gender: true,
    status: true,
    profileImage: {
      select: { id: true, path: true },
    },
  });
};

export const patientDetailSelect = () => {
  return Prisma.validator<Prisma.PatientSelect>()({
    id: true,
    medicalRecordNumber: true,
    fullName: true,
    birthDate: true,
    gender: true,
    status: true,
    lastVisitAt: true,
    createdAt: true,
    updatedAt: true,
    accountId: true,
    profileImage: {
      select: { id: true, path: true },
    },
    account: {
      select: { id: true, phone: true, status: true },
    },
    formValues: {
      select: {
        value: true,
        fieldDefinition: {
          select: { key: true, labelAr: true, labelEn: true, type: true },
        },
      },
    },
  });
};

export const patientListSelect = () => {
  return Prisma.validator<Prisma.PatientSelect>()({
    id: true,
    medicalRecordNumber: true,
    fullName: true,
    birthDate: true,
    gender: true,
    status: true,
    lastVisitAt: true,
    accountId: true,
    profileImage: {
      select: { id: true, path: true },
    },
    account: {
      select: { phone: true },
    },
  });
};

export type RawPatient = Prisma.PatientGetPayload<{
  select: ReturnType<typeof patientSelect>;
}>;

export type RawPatientFormDefinition =
  Prisma.PatientFormFieldDefinitionGetPayload<{
    select: ReturnType<typeof patientFormDefinitionSelect>;
  }>;

export type RawPatientMy = Prisma.PatientGetPayload<{
  select: ReturnType<typeof patientMySelect>;
}>;

export type RawPatientDetail = Prisma.PatientGetPayload<{
  select: ReturnType<typeof patientDetailSelect>;
}>;

export type RawPatientList = Prisma.PatientGetPayload<{
  select: ReturnType<typeof patientListSelect>;
}>;
