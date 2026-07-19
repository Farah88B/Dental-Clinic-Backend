import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AUTH_ERROR_CODES } from 'src/common/constants/auth.constants';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';

// There's no separate "Admin" role in this system — the DOCTOR role IS the
// admin (per SRS 2.11 / SC-6). "Last admin protection" therefore means
// "last account holding the DOCTOR role", checked by role code, not by name.
const DOCTOR_ROLE_CODE = 'DOCTOR';

@Injectable()
export class AccountRolesService {
  constructor(private readonly prisma: PrismaService) {}

  // Additive: an account can hold several roles at once (e.g. a doctor
  // account that is later also given a future ADMIN-equivalent role).
  async assign(accountId: number, roleId: number): Promise<void> {
 const account = await this.prisma.account.findUnique({
  where: { id: accountId },
});

if (!account) {
  throw new NotFoundException(ERROR_CODES.ACCOUNT_NOT_FOUND);
}

const role = await this.prisma.role.findUnique({
  where: { id: roleId },
});

if (!role) {
  throw new NotFoundException(ERROR_CODES.ROLE_NOT_FOUND);
}
    await this.prisma.accountRole.upsert({
      where: { accountId_roleId: { accountId, roleId } },
      update: {},
      create: { accountId, roleId },
    });
  }
  // modules/roles/services/account-roles.service.ts — إضافة method جديدة على الملف الموجود
async getAuthenticatedAccountPayload(accountId: number) {
  const account = await this.prisma.account.findUnique({
  where: { id: accountId },
});

if (!account) {
    throw new NotFoundException(ERROR_CODES.ACCOUNT_NOT_FOUND);
}

  const accountRoles = await this.prisma.accountRole.findMany({
    where: { accountId },
    include: {
      role: {
        include: { permissions: { include: { permission: { select: { code: true } } } } },
      },
    },
  });

  return accountRoles.map((ar) => ({
    id: ar.role.id,
    permissions: ar.role.permissions.map((rp) => rp.permission.code),
  }));
}

// أضيفي هاد الـ method جوا AccountRolesService الموجودة، واستبدلي فحص revoke()
// الحالي (prisma.accountRole.count) باستخدامها لضمان الاتساق:

async countActiveHoldersOfRole(roleCode: string): Promise<number> {
  return this.prisma.accountRole.count({
    where: {
      role: { code: roleCode },
      account: { status: 'ACTIVE' },
    },
  });
}

 // وعدّلي revoke() الموجودة بالضبط بهاد الجزء:
async revoke(accountId: number, roleId: number): Promise<void> {
  const role = await this.prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  const account = await this.prisma.account.findUniqueOrThrow({ where: { id: accountId } });

  if (role.code === DOCTOR_ROLE_CODE && account.status === 'ACTIVE') {
    const activeCount = await this.countActiveHoldersOfRole(DOCTOR_ROLE_CODE);
    if (activeCount <= 1) {
      throw new ForbiddenException(AUTH_ERROR_CODES.CANNOT_DISABLE_LAST_ADMIN);
    }
  }

  await this.prisma.accountRole.delete({
    where: { accountId_roleId: { accountId, roleId } },
  });

}

  async listForAccount(accountId: number) {
    return this.prisma.accountRole.findMany({
      where: { accountId },
      include: {
        role: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      },
    });
  }
}