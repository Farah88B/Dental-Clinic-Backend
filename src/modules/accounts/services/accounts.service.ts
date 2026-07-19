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

const DOCTOR_ROLE_CODE = 'DOCTOR';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountAdapter: AccountAdapter,
    private readonly accountRolesService: AccountRolesService,
  ) {}

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

  async findOne(id: number) {
    // findUniqueOrThrow -> Prisma P2025 on miss -> PrismaExceptionFilter
    // (Epic 0) turns it into 404 NOT_FOUND automatically.
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id },
      select: accountSelect(),
    });
    return this.accountAdapter.adapt(account);
  }

  // UC: create staff account invitation
  async create(dto: CreateAccountDto, createdById: number) {
    // No manual "does phone exist" check: if it does, Prisma throws P2002
    // on create() -> PrismaExceptionFilter -> 409 DUPLICATE_VALUE.
    // No manual "does role exist" check either: findUniqueOrThrow below
    // throws P2025 -> 404 NOT_FOUND if roleId is invalid, BEFORE we touch
    // the Account table, so we never create an orphaned account.
    await this.prisma.role.findUniqueOrThrow({ where: { id: dto.roleId } });

    const account = await this.prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: { phone: dto.phone, status: 'INVITED', createdById },
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

  async update(id: number, dto: UpdateAccountDto) {
    // No manual duplicate-phone check: P2002 on update() is handled the
    // same way as create() above.
    const account = await this.prisma.account.update({
      where: { id },
      data: dto,
      select: accountSelect(),
    });
    return this.accountAdapter.adapt(account);
  }

  async updateStatus(id: number, dto: UpdateAccountStatusDto, currentAccountId: number) {
    if (id === currentAccountId) {
      throw new ForbiddenException(AUTH_ERROR_CODES.CANNOT_DISABLE_SELF);
    }

    if (dto.status === 'DISABLED') {
      const holdsDoctorRole = await this.prisma.accountRole.findFirst({
        where: { accountId: id, role: { code: DOCTOR_ROLE_CODE } },
      });

      if (holdsDoctorRole) {
        // Counted BEFORE the update, so if this account is currently ACTIVE
        // and holds DOCTOR, it's still included in the count — a result of
        // exactly 1 means disabling it removes the last active doctor.
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