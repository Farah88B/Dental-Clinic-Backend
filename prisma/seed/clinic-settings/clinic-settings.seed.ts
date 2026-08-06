import { PrismaService } from '../../../src/common/prisma/services/prisma.service';
import clinicSettingsData from './clinic-settings.data.json';

export async function upsertClinicSettings(prisma: PrismaService) {
  await prisma.clinicSettings.upsert({
    where: {
      id: 1,
    },
    create: {
      id: 1,
      ...clinicSettingsData,
    },
    update: {
      latitude: clinicSettingsData.latitude,
      longitude: clinicSettingsData.longitude,
      checkInRadiusMeters: clinicSettingsData.checkInRadiusMeters,
    },
  });
}
