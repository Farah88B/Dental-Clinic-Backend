import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import clinicSettingsData from './clinic-settings.data.json';

export async function upsertClinicSettings(prisma: PrismaService) {
  await prisma.clinicSettings.upsert({
    where: {
      id: 1,
    },
    update: {},
    create: {
      id: 1,
      ...clinicSettingsData,
    },
  });
}