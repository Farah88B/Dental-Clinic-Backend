import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AccountRolesService } from './account-roles.service';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
describe('AccountRolesService', () => {
  let service: AccountRolesService;
  let prisma: {
    accountRole: { upsert: jest.Mock; delete: jest.Mock; count: jest.Mock; findMany: jest.Mock };
    role: { findUniqueOrThrow: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      accountRole: { upsert: jest.fn(), delete: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      role: { findUniqueOrThrow: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [AccountRolesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(AccountRolesService);
  });

  it('assign() upserts the AccountRole row (idempotent)', async () => {
    await service.assign(1, 2);

    expect(prisma.accountRole.upsert).toHaveBeenCalledWith({
      where: { accountId_roleId: { accountId: 1, roleId: 2 } },
      update: {},
      create: { accountId: 1, roleId: 2 },
    });
  });

it('revoke() blocks removing the last DOCTOR-role holder', async () => {
  prisma.role.findUniqueOrThrow.mockResolvedValue({
    id: 1,
    code: 'DOCTOR',
  });

  prisma.accountRole.count.mockResolvedValue(1);

  await expect(
    service.revoke(10, 1),
  ).rejects.toMatchObject({
    response: {
      code: ERROR_CODES.CANNOT_DISABLE_LAST_ADMIN,
    },
  });

  expect(prisma.accountRole.delete).not.toHaveBeenCalled();
});
  it('revoke() allows removing DOCTOR when another account still holds it', async () => {
    prisma.role.findUniqueOrThrow.mockResolvedValue({ id: 1, code: 'DOCTOR' });
    prisma.accountRole.count.mockResolvedValue(2); // two doctors hold it

    await service.revoke(10, 1);

    expect(prisma.accountRole.delete).toHaveBeenCalledWith({
      where: { accountId_roleId: { accountId: 10, roleId: 1 } },
    });
  });

  it('revoke() allows removing a non-DOCTOR role without any count check', async () => {
    prisma.role.findUniqueOrThrow.mockResolvedValue({ id: 2, code: 'SECRETARY' });

    await service.revoke(10, 2);

    expect(prisma.accountRole.count).not.toHaveBeenCalled();
    expect(prisma.accountRole.delete).toHaveBeenCalled();
  });
});