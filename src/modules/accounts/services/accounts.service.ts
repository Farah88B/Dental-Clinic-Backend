import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import { AUTH_ERROR_CODES } from 'src/common/constants/auth.constants';
import { hashPassword } from 'src/common/utils/hash.utils';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { UpdateAccountStatusDto } from '../dto/update-account-status.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AccountAdapter } from '../adapter/account.adapter';
import { AccountRolesService } from 'src/modules/account-roles/services/account-roles.service';
import { accountSelect } from '../selectors/account.selector';
import { AccountStatus } from '@prisma/client';
// Role codes are business invariants, not request-scoped values.
// DOCTOR is the admin-equivalent role in this system, so the code is kept static here.
const DOCTOR_ROLE_CODE = 'DOCTOR';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountAdapter: AccountAdapter,
    private readonly accountRolesService: AccountRolesService,
  ) {}

  // Return a paginated list of staff accounts for the admin UI.
  async list(pagination: PaginationDto) {
    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        select: accountSelect(),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.account.count(),
    ]);
    const items = await this.accountAdapter.fromArray(accounts);
    return new AdminListDto(items, total);
  }

  // Return a single account with the response shape expected by the UI.
  async findOne(id: number) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id },
      select: accountSelect(),
    });
    return this.accountAdapter.adapt(account);
  }

  // UC: create staff account invitation
  // Create an invited staff account and attach the selected role.
  async create(dto: CreateAccountDto, createdById: number) {
    await this.prisma.role.findUniqueOrThrow({ where: { id: dto.roleId } });

    const account = await this.prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: { phone: dto.phone, status: AccountStatus.INVITED, createdById },
      });

      await tx.accountRole.create({
        data: { accountId: created.id, roleId: dto.roleId },
      });

      return tx.account.findUniqueOrThrow({
        where: { id: created.id },
        select: accountSelect(),
      });
    });

    return this.accountAdapter.adapt(account);
  }

  // Update the editable account fields.
  async update(id: number, dto: UpdateAccountDto) {
    const account = await this.prisma.account.update({
      where: { id },
      data: dto,
      select: accountSelect(),
    });
    return this.accountAdapter.adapt(account);
  }

  // Enable or disable an account with last-doctor and self-disable guards.
  async updateStatus(id: number, dto: UpdateAccountStatusDto, currentAccountId: number) {
    if (id === currentAccountId) {
      throw new ForbiddenException(AUTH_ERROR_CODES.CANNOT_DISABLE_SELF);
    }

    if (dto.status === AccountStatus.DISABLED) {
      const holdsDoctorRole = await this.prisma.accountRole.findFirst({
        where: { accountId: id, role: { code: DOCTOR_ROLE_CODE } },
      });

      if (holdsDoctorRole) {
        const activeDoctorCount = await this.accountRolesService.countActiveHoldersOfRole(
          DOCTOR_ROLE_CODE,
        );
        if (activeDoctorCount <= 1) {
          throw new ForbiddenException(AUTH_ERROR_CODES.CANNOT_DISABLE_LAST_ADMIN);
        }
      }
    }

    const account = await this.prisma.account.update({
      where: { id },
      data: { status: dto.status },
      select: accountSelect(),
    });
    return this.accountAdapter.adapt(account);
  }

  //TODO: delete this function
  // UC: admin resets a staff member's password directly (no OTP —
  // the admin is already authenticated and authorized via PermissionsGuard)
  // Reset a staff password directly from the admin panel.
  async resetPassword(id: number, dto: ResetPasswordDto) {
    const password = await hashPassword(dto.newPassword);
    const account = await this.prisma.account.update({
      where: { id },
      data: { password },
      select: accountSelect(),
    });
    return this.accountAdapter.adapt(account);
  }
}