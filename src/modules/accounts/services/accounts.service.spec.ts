
import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { AccountAdapter } from '../adapter/account.adapter';

import * as hashUtils from 'src/common/utils/hash.utils';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { AUTH_ERROR_CODES } from 'src/common/constants/auth.constants';
import { AccountRolesService } from 'src/modules/account-roles/services/account-roles.service';
import { accountSelect } from '../selectors/account.selector';

jest.mock('src/common/utils/hash.utils', () => ({
  hashPassword: jest.fn(),
}));
describe('AccountsService', () => {
  let service: AccountsService;

  const prismaMock = {
    account: { findMany: jest.fn(), count: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn() },
    role: { findUniqueOrThrow: jest.fn() },
    accountRole: { create: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn((callback) => callback(prismaMock)),
  };

  const accountRolesServiceMock = {
    countActiveHoldersOfRole: jest.fn(),
  };

  const rawAccount = {
    id: 10,
    phone: '+963999999999',
    status: 'INVITED',
    biometricEnabled: false,
    phoneVerifiedAt: null,
    createdById: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    roles: [{ role: { id: 2, code: 'SECRETARY', nameAr: 'سكرتيرة', nameEn: 'Secretary' } }],
  };

 beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AccountsService,
      AccountAdapter,
      { provide: PrismaService, useValue: prismaMock },
      { provide: AccountRolesService, useValue: accountRolesServiceMock },
    ],
  }).compile();

  service = module.get(AccountsService);

  jest.clearAllMocks();

  (hashUtils.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
});

  describe('create', () => {
    it('creates an account and assigns the role in one transaction', async () => {
      prismaMock.role.findUniqueOrThrow.mockResolvedValue({ id: 2, code: 'SECRETARY' });
      prismaMock.account.create.mockResolvedValue({ id: 10 });
      prismaMock.account.findUniqueOrThrow.mockResolvedValue(rawAccount);

      const result = await service.create({ phone: rawAccount.phone, roleId: 2 }, 1);

      expect(result.phone).toBe(rawAccount.phone);
      expect(prismaMock.accountRole.create).toHaveBeenCalledWith({
        data: { accountId: 10, roleId: 2 },
      });
    });

    it('lets a Prisma unique-constraint error on duplicate phone propagate unhandled', async () => {
      prismaMock.role.findUniqueOrThrow.mockResolvedValue({ id: 2, code: 'SECRETARY' });
      const dupeError = Object.assign(new Error('duplicate'), { code: 'P2002' });
      prismaMock.account.create.mockRejectedValue(dupeError);

      await expect(service.create({ phone: rawAccount.phone, roleId: 2 }, 1)).rejects.toBe(dupeError);
      // Intentionally not caught here — PrismaExceptionFilter (Epic 0) handles it.
    });

    it('lets a Prisma not-found error on invalid roleId propagate unhandled', async () => {
      const notFoundError = Object.assign(new Error('not found'), { code: 'P2025' });
      prismaMock.role.findUniqueOrThrow.mockRejectedValue(notFoundError);

      await expect(service.create({ phone: rawAccount.phone, roleId: 999 }, 1)).rejects.toBe(notFoundError);
      expect(prismaMock.account.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the adapted account', async () => {
      prismaMock.account.findUniqueOrThrow.mockResolvedValue(rawAccount);

      const result = await service.findOne(10);

      expect(result.id).toBe(10);
      expect(result.roles).toEqual([{ id: 2, code: 'SECRETARY', nameAr: 'سكرتيرة', nameEn: 'Secretary' }]);
    });
  });

  describe('updateStatus', () => {
    it('blocks disabling your own account', async () => {
      await expect(
        service.updateStatus(1, { status: 'DISABLED' }, 1),
      ).rejects.toMatchObject({ message: AUTH_ERROR_CODES.CANNOT_DISABLE_SELF });
    });

    it('blocks disabling the last active DOCTOR account', async () => {
      prismaMock.accountRole.findFirst.mockResolvedValue({ accountId: 2, role: { code: 'DOCTOR' } });
      accountRolesServiceMock.countActiveHoldersOfRole.mockResolvedValue(1);

      await expect(
        service.updateStatus(2, { status: 'DISABLED' }, 1),
      ).rejects.toMatchObject({ message: AUTH_ERROR_CODES.CANNOT_DISABLE_LAST_ADMIN });

      expect(prismaMock.account.update).not.toHaveBeenCalled();
    });

    it('allows disabling a DOCTOR account when another active doctor still exists', async () => {
      prismaMock.accountRole.findFirst.mockResolvedValue({ accountId: 2, role: { code: 'DOCTOR' } });
      accountRolesServiceMock.countActiveHoldersOfRole.mockResolvedValue(2);
      prismaMock.account.update.mockResolvedValue({ ...rawAccount, status: 'DISABLED' });

      await service.updateStatus(2, { status: 'DISABLED' }, 1);

      expect(prismaMock.account.update).toHaveBeenCalled();
    });

    it('allows disabling a non-DOCTOR account without any active-count check', async () => {
      prismaMock.accountRole.findFirst.mockResolvedValue(null); // account holds no DOCTOR role
      prismaMock.account.update.mockResolvedValue({ ...rawAccount, status: 'DISABLED' });

      await service.updateStatus(2, { status: 'DISABLED' }, 1);

      expect(accountRolesServiceMock.countActiveHoldersOfRole).not.toHaveBeenCalled();
      expect(prismaMock.account.update).toHaveBeenCalled();
    });
  });

describe('resetPassword', () => {
  it('hashes the new password before persisting', async () => {
    prismaMock.account.update.mockResolvedValue(rawAccount);

    await service.resetPassword(10, {
      newPassword: 'SomeNewPass123!',
    });

    expect(hashUtils.hashPassword).toHaveBeenCalledWith(
      'SomeNewPass123!',
    );

    expect(prismaMock.account.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        password: 'hashed-password',
      },
      select: accountSelect(),
    });
  });
});
});