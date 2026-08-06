import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { AppointmentAdapter } from '../adapter/appointment.adapter';
import { AppointmentListScope } from '../dto/appointment-list.dto';
import {
  AppointmentQueryService,
  PAST_APPOINTMENT_STATUSES,
  UPCOMING_APPOINTMENT_STATUSES,
} from './appointment-query.service';

describe('AppointmentQueryService', () => {
  let service: AppointmentQueryService;

  const prisma = {
    patient: { findUnique: jest.fn() },
    appointment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const adapter = {
    adaptListItem: jest.fn((raw, opts) => ({
      id: raw.id,
      includePatient: opts.includePatient,
      status: raw.status,
      scheduledAt: raw.scheduledAt,
      type: raw.type,
    })),
    adaptDetail: jest.fn((raw) => ({ id: raw.id, detail: true })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppointmentQueryService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppointmentAdapter, useValue: adapter },
      ],
    }).compile();
    service = moduleRef.get(AppointmentQueryService);
    prisma.patient.findUnique.mockResolvedValue({ id: 7 });
  });

  it('returns nearest upcoming appointment only', async () => {
    const scheduledAt = new Date(Date.now() + 86_400_000);
    prisma.appointment.findFirst.mockResolvedValue({
      id: 1,
      status: AppointmentStatus.CONFIRMED,
      scheduledAt,
      type: AppointmentType.CONSULTATION,
      patient: { id: 7, fullName: 'A', medicalRecordNumber: 'MRN1' },
    });

    const result = await service.getUpcomingForPatient(7, 1);

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: 7,
          status: { in: UPCOMING_APPOINTMENT_STATUSES },
        }),
        orderBy: { scheduledAt: 'asc' },
      }),
    );
    expect(result?.id).toBe(1);
  });

  it('lists UPCOMING with ascending order', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);

    await service.listForPatient(
      {
        patientId: 7,
        scope: AppointmentListScope.UPCOMING,
        page: 1,
        pageSize: 20,
        skip: 0,
        take: 20,
      } as never,
      1,
    );

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { scheduledAt: 'asc' },
      }),
    );
  });

  it('lists PAST by terminal statuses only', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);

    await service.listForPatient(
      {
        patientId: 7,
        scope: AppointmentListScope.PAST,
        page: 1,
        pageSize: 20,
        skip: 0,
        take: 20,
      } as never,
      1,
    );

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patientId: 7,
          status: { in: PAST_APPOINTMENT_STATUSES },
        },
        orderBy: { scheduledAt: 'desc' },
      }),
    );
  });

  it('forbids app detail when patient is not owned', async () => {
    prisma.appointment.findUniqueOrThrow.mockResolvedValue({
      id: 9,
      patientId: 7,
      patient: { id: 7, fullName: 'A', medicalRecordNumber: 'MRN1' },
    });
    prisma.patient.findUnique.mockResolvedValue(null);

    await expect(service.getByIdForApp(9, 99)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns staff list with status counts independent of status filter', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 1,
        patientId: 7,
        type: AppointmentType.CONSULTATION,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: new Date(),
        durationMinutes: 30,
        isWaiting: false,
        reasonForVisit: null,
        patient: { id: 7, fullName: 'Sara', medicalRecordNumber: 'MRN1' },
      },
    ]);
    prisma.appointment.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    prisma.appointment.groupBy.mockResolvedValue([
      { status: AppointmentStatus.CONFIRMED, _count: { _all: 4 } },
      { status: AppointmentStatus.CANCELLED, _count: { _all: 1 } },
    ]);

    const result = await service.listForStaff({
      status: AppointmentStatus.CONFIRMED,
      search: 'Sara',
      page: 1,
      pageSize: 20,
      skip: 0,
      take: 20,
    } as never);

    expect(result.total).toBe(1);
    expect(result.counts.byStatus.CONFIRMED).toBe(4);
    expect(result.counts.byStatus.CANCELLED).toBe(1);
    expect(result.counts.waiting).toBe(2);
    expect(adapter.adaptListItem).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includePatient: true }),
    );

    const groupByWhere = prisma.appointment.groupBy.mock.calls[0][0].where;
    expect(groupByWhere.status).toBeUndefined();
  });
});
