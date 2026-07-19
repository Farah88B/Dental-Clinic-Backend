import { Test } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { RoleAdapter } from '../adapter/role.adapter';
import { PrismaService } from 'src/common/prisma/services/prisma.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: {
    role: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    rolePermission: { deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const rawRole = {
    id: 1,
    code: 'DOCTOR',
    nameAr: 'طبيب',
    nameEn: 'Doctor',
    descriptionAr: null,
    descriptionEn: null,
    createdAt: new Date('2026-01-01'),
    permissions: [{ permissionId: 5 }, { permissionId: 8 }],
  };

  beforeEach(async () => {
    prisma = {
      role: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      rolePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RolesService,
        RoleAdapter,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(RolesService);
  });

  it('list() returns adapted items with the correct total', async () => {
    prisma.role.findMany.mockResolvedValue([rawRole]);
    prisma.role.count.mockResolvedValue(1);

    const result = await service.list({ page: 1, pageSize: 20, skip: 0, take: 20 } as any);

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 1,
      code: 'DOCTOR',
      permissionIds: [5, 8],
    });
  });

  it('create() persists and returns the adapted role', async () => {
    prisma.role.create.mockResolvedValue({ ...rawRole, permissions: [] });

    const result = await service.create({
      code: 'RECEPTIONIST',
      nameAr: 'موظف استقبال',
      nameEn: 'Receptionist',
    });

    expect(prisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: 'RECEPTIONIST' }) }),
    );
    expect(result.code).toBe('DOCTOR'); // from the mocked resolved value above
  });

  it('delete() lets a Prisma FK-constraint error propagate unhandled (PrismaExceptionFilter deals with it)', async () => {
    const fkError = Object.assign(new Error('FK violation'), { code: 'P2003' });
    prisma.role.delete.mockRejectedValue(fkError);

    await expect(service.delete(1)).rejects.toBe(fkError);
    // Intentionally NOT catching/wrapping here — this test documents that
    // RolesService does zero manual "is it in use" checking by design.
  });

  it('assignPermissions() replaces the full set (delete-then-create), not append', async () => {
    prisma.role.findUniqueOrThrow.mockResolvedValue(rawRole);

    await service.assignPermissions(1, { permissionIds: [5, 8] });

    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 1 } });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: 1, permissionId: 5 },
        { roleId: 1, permissionId: 8 },
      ],
      skipDuplicates: true,
    });
  });
});