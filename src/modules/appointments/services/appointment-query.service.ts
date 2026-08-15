import { ForbiddenException, Injectable } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { AdminListDto } from 'src/common/admin/admin-list.dto';
import { toUiLanguage } from 'src/common/i18n/localize.helper';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { AppointmentAdapter } from '../adapter/appointment.adapter';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import {
  AppointmentListCountsDto,
  AppointmentListItemDto,
  AppointmentListQueryDto,
  AppointmentListScope,
  AppointmentStaffListResponseDto,
  AppointmentStatusCountsDto,
  PatientAppointmentListQueryDto,
} from '../dto/appointment-list.dto';
import {
  appointmentDetailSelect,
  appointmentListSelect,
} from '../selectors/appointment.select';

/** Active / in-progress statuses shown under patient list scope UPCOMING. */
export const UPCOMING_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING_CONFIRMATION,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_TREATMENT,
];

/** Terminal statuses shown under patient list scope PAST. */
export const PAST_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

@Injectable()
export class AppointmentQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: AppointmentAdapter,
  ) {}

  async getUpcomingForPatient(
    patientId: number,
    accountId: number,
  ): Promise<AppointmentListItemDto | null> {
    await this.assertOwnedPatient(patientId, accountId);

    const row = await this.prisma.appointment.findFirst({
      where: this.upcomingWhere(patientId),
      select: appointmentListSelect(),
      orderBy: { scheduledAt: 'asc' },
    });

    if (!row) {
      return null;
    }

    return this.adapter.adaptListItem(row, { includePatient: false });
  }

  async listForPatient(
    query: PatientAppointmentListQueryDto,
    accountId: number,
    preferredLanguage?: string,
  ): Promise<AdminListDto<AppointmentListItemDto>> {
    await this.assertOwnedPatient(query.patientId, accountId);

    const language = toUiLanguage(preferredLanguage);
    const where =
      query.scope === AppointmentListScope.UPCOMING
        ? this.upcomingWhere(query.patientId)
        : this.pastWhere(query.patientId);

    const orderBy: Prisma.AppointmentOrderByWithRelationInput =
      query.scope === AppointmentListScope.UPCOMING
        ? { scheduledAt: 'asc' }
        : { scheduledAt: 'desc' };

    const [rows, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        select: appointmentListSelect(),
        skip: query.skip,
        take: query.take,
        orderBy,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return new AdminListDto(
      rows.map((row) =>
        this.adapter.adaptListItem(row, {
          includePatient: false,
          language,
        }),
      ),
      total,
    );
  }

  async getByIdForApp(
    id: number,
    accountId: number,
  ): Promise<AppointmentResponseDto> {
    const row = await this.prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: appointmentDetailSelect(),
    });

    if (row.patientId) {
      await this.assertOwnedPatient(row.patientId, accountId);
    }

    return this.adapter.adaptDetail(row);
  }

  async listForStaff(
    query: AppointmentListQueryDto,
  ): Promise<AppointmentStaffListResponseDto> {
    const listWhere = this.buildStaffWhere(query);
    const facetWhere = this.buildStaffWhere({
      ...query,
      status: undefined,
      isWaiting: undefined,
    });

    const sortField = query.sortBy ?? 'scheduledAt';
    const sortDir = query.sortDirection ?? 'desc';

    const [rows, total, statusGroups, waiting] = await Promise.all([
      this.prisma.appointment.findMany({
        where: listWhere,
        select: appointmentListSelect(),
        skip: query.skip,
        take: query.take,
        orderBy: { [sortField]: sortDir },
      }),
      this.prisma.appointment.count({ where: listWhere }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: facetWhere,
        _count: { _all: true },
      }),
      this.prisma.appointment.count({
        where: { ...facetWhere, isWaiting: true },
      }),
    ]);

    const byStatus = this.emptyStatusCounts();
    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all;
    }

    return new AppointmentStaffListResponseDto({
      items: rows.map((row) =>
        this.adapter.adaptListItem(row, { includePatient: true }),
      ),
      total,
      counts: new AppointmentListCountsDto({
        byStatus: new AppointmentStatusCountsDto(byStatus),
        waiting,
      }),
    });
  }

  async getByIdForStaff(id: number): Promise<AppointmentResponseDto> {
    const row = await this.prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: appointmentDetailSelect(),
    });
    return this.adapter.adaptDetail(row);
  }

  private upcomingWhere(patientId: number): Prisma.AppointmentWhereInput {
    return {
      patientId,
      status: { in: UPCOMING_APPOINTMENT_STATUSES },
    };
  }

  private pastWhere(patientId: number): Prisma.AppointmentWhereInput {
    return {
      patientId,
      status: { in: PAST_APPOINTMENT_STATUSES },
    };
  }

  private buildStaffWhere(
    query: Pick<
      AppointmentListQueryDto,
      'search' | 'status' | 'isWaiting' | 'scheduledFrom' | 'scheduledTo'
    >,
  ): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.patient = {
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { medicalRecordNumber: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (typeof query.isWaiting === 'boolean') {
      where.isWaiting = query.isWaiting;
    }

    if (query.scheduledFrom || query.scheduledTo) {
      where.scheduledAt = {};
      if (query.scheduledFrom) {
        where.scheduledAt.gte = query.scheduledFrom;
      }
      if (query.scheduledTo) {
        where.scheduledAt.lte = query.scheduledTo;
      }
    }

    return where;
  }

  private emptyStatusCounts(): Record<AppointmentStatus, number> {
    return {
      PENDING_CONFIRMATION: 0,
      CONFIRMED: 0,
      CHECKED_IN: 0,
      IN_TREATMENT: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };
  }

  private async assertOwnedPatient(patientId: number, accountId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId, accountId },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException();
    }
  }
}
