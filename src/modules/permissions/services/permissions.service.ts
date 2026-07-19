import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PermissionAdapter } from '../adapter/permission.adapter';
import { permissionSelect } from '../selectors/permission.select';

// Read-only by design: permissions come from the seed, not from the API.
@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionAdapter: PermissionAdapter,
  ) {}

  async list() {
    const permissions = await this.prisma.permission.findMany({
      select: permissionSelect(),
      orderBy: { order: 'desc' },
    });
    return this.permissionAdapter.fromArray(permissions);
  }
}