import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import { RoleAdapter } from '../adapter/role.adapter';
import { roleSelect } from '../selectors/role.select';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionsDto } from 'src/modules/permissions/dto/assign-permissions.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleAdapter: RoleAdapter,
  ) {}

  async list(pagination: PaginationDto) {
    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        select: roleSelect(),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count(),
    ]);
    const items = await this.roleAdapter.fromArray(roles);
    return new AdminListDto(items, total);
  }

  async getById(id: number) {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { id },
      select: roleSelect(),
    });
    return this.roleAdapter.adapt(role);
  }

  async create(dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: dto,
      select: roleSelect(),
    });
    return this.roleAdapter.adapt(role);
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.update({
      where: { id },
      data: dto,
      select: roleSelect(),
    });
    return this.roleAdapter.adapt(role);
  }

  // No manual "in use" check here on purpose: if the role is still assigned
  // to any Account, Prisma throws P2003 (FK constraint), and
  // PrismaExceptionFilter (Epic 0) converts that into 409 IN_USE_CANNOT_DELETE
  // automatically — same safety net, zero duplicated logic.
  async delete(id: number): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }

  // Full replace of the role's permission set (not additive) — matches
  // the AssignPermissionsDto contract: "the role ends up with EXACTLY this list".
  async assignPermissions(id: number, dto: AssignPermissionsDto) {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        skipDuplicates: true,
      }),
    ]);

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { id },
      select: roleSelect(),
    });
    return this.roleAdapter.adapt(role);
  }
}