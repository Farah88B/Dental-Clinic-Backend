import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import { PatientFormFieldType } from '@prisma/client';
import DEFAULT_PATIENT_FORM_FIELDS from './patient-form-field.data.json';

/**
 * Seeds the initial dynamic Patient Form fields (chronic diseases, allergies).
 *
 * Requires that roles + accounts have already been seeded (needs an existing
 * DOCTOR account to satisfy PatientFormFieldDefinition.createdById).
 *
 * On conflict (field already exists): intentionally does NOT overwrite
 * `options`/`required`/`validation` — same reasoning as clinic-settings.seed.ts
 * (update: {}). Re-running this seed must never silently undo an admin's
 * later changes (e.g. a disabled option, or a relaxed `required` flag).
 * Only labelAr/labelEn/displayOrder are safe to keep in sync on reseed.
 */
export async function upsertDefaultPatientFormFields(prisma: PrismaService) {
  const doctorRole = await prisma.role.findUnique({
    where: { code: 'DOCTOR' },
  });

  if (!doctorRole) {
    throw new Error(
      'DOCTOR role not found — seed roles before patient form fields',
    );
  }

  const doctorAccountRole = await prisma.accountRole.findFirst({
    where: { roleId: doctorRole.id },
    orderBy: { assignedAt: 'asc' },
  });

  if (!doctorAccountRole) {
    throw new Error(
      'No account with DOCTOR role found — seed accounts before patient form fields',
    );
  }

  const createdById = doctorAccountRole.accountId;

  for (const field of DEFAULT_PATIENT_FORM_FIELDS) {
    await prisma.patientFormFieldDefinition.upsert({
      where: {
        key: field.key,
      },

      update: {
        labelAr: field.labelAr,
        labelEn: field.labelEn,
        displayOrder: field.displayOrder,
      },

      create: {
        key: field.key,
        labelAr: field.labelAr,
        labelEn: field.labelEn,
        type: field.type as PatientFormFieldType,
        required: field.required,
        validation: field.validation ?? undefined,
        options: field.options ?? undefined,
        displayOrder: field.displayOrder,
        createdById,
      },
    });
  }
}