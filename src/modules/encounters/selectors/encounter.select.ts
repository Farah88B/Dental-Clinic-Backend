import { Prisma } from '@prisma/client';

export const medicalAttachmentSelect = () => {
  return Prisma.validator<Prisma.MedicalAttachmentSelect>()({
    id: true,
    encounterId: true,
    mediaFileId: true,
    type: true,
    title: true,
    createdAt: true,
    updatedAt: true,
  });
};

export const encounterSelect = () => {
  return Prisma.validator<Prisma.EncounterSelect>()({
    id: true,
    treatmentSessionId: true,
    appointmentId: true,
    status: true,
    diagnosis: true,
    clinicalNotes: true,
    teeth: true,
    prescription: true,
    createdAt: true,
    updatedAt: true,
    attachments: {
      orderBy: { createdAt: 'asc' },
      select: medicalAttachmentSelect(),
    },
  });
};

export type RawMedicalAttachmentSelect = Prisma.MedicalAttachmentGetPayload<{
  select: ReturnType<typeof medicalAttachmentSelect>;
}>;

export type RawEncounterSelect = Prisma.EncounterGetPayload<{
  select: ReturnType<typeof encounterSelect>;
}>;
