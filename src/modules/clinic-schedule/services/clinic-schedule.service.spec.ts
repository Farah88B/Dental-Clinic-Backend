import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DayOfWeek } from '@prisma/client';
import { ERROR_CODES } from 'src/common/constants/error-codes.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ClinicScheduleAdapter } from '../adapter/clinic-schedule.adapter';
import { assertValidWorkingWindow } from '../helpers/working-hours-validation.helper';
import { parseTimeToMinutes } from '../helpers/schedule-time.helper';
import { ClinicScheduleService } from './clinic-schedule.service';

describe('ClinicScheduleService', () => {
  let service: ClinicScheduleService;

  const prisma = {
    clinicWorkingHours: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    clinicScheduleException: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    clinicSettings: {
      findFirstOrThrow: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClinicScheduleService,
        ClinicScheduleAdapter,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('Asia/Damascus'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ClinicScheduleService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.clinicScheduleException.findMany.mockResolvedValue([]);
  });

  it('parses human times to minutes', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540);
    expect(parseTimeToMinutes('17:00')).toBe(1020);
  });

  describe('assertValidWorkingWindow', () => {
    it('rejects invalid ranges and overlapping breaks', () => {
      expect(() =>
        assertValidWorkingWindow({
          isWorkingDay: true,
          startMinute: 540,
          endMinute: 500,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        assertValidWorkingWindow({
          isWorkingDay: true,
          startMinute: 540,
          endMinute: 1020,
          breaks: [
            { startMinute: 700, endMinute: 760 },
            { startMinute: 750, endMinute: 800 },
          ],
        }),
      ).toThrow(BadRequestException);
    });
  });

  it('rejects past dates for exceptions', async () => {
    await expect(
      service.createException(
        {
          date: '2020-01-01',
          isWorkingDay: false,
        },
        1,
      ),
    ).rejects.toMatchObject({
      response: { message: ERROR_CODES.PAST_DATE_NOT_ALLOWED },
    });
  });

  it('rejects incomplete weekday lists on update', async () => {
    await expect(
      service.updateWorkingHours(
        {
          days: [
            {
              dayOfWeek: DayOfWeek.SUNDAY,
              isWorkingDay: true,
              startTime: '09:00',
              endTime: '17:00',
            },
          ] as never,
        },
        1,
      ),
    ).rejects.toMatchObject({
      response: { message: ERROR_CODES.INVALID_WORKING_HOURS_DAYS },
    });
  });

  it('builds calendar with isBookable for patients using horizon', async () => {
    prisma.clinicSettings.findFirstOrThrow.mockResolvedValue({
      maxBookingHorizonDays: 30,
      onlineBookingEnabled: true,
    });
    prisma.clinicScheduleException.findUnique.mockResolvedValue(null);
    prisma.clinicWorkingHours.findUnique.mockImplementation(
      ({ where }: { where: { dayOfWeek: DayOfWeek } }) => {
        const closed =
          where.dayOfWeek === DayOfWeek.FRIDAY ||
          where.dayOfWeek === DayOfWeek.SATURDAY;
        return Promise.resolve({
          isWorkingDay: !closed,
          startMinute: closed ? null : 540,
          endMinute: closed ? null : 1020,
          breaks: [],
        });
      },
    );

    const days = await service.getCalendarMonth(2026, 8, {
      isStaffScheduleViewer: false,
    });

    expect(days.length).toBe(31);
    expect(days[0]).toEqual(
      expect.objectContaining({
        date: '2026-08-01',
        isWorkingDay: expect.any(Boolean),
        isBookable: expect.any(Boolean),
      }),
    );
  });

  it('BR-50: rejects closing a day that has future appointments unless confirmed', async () => {
    // Pick a far-future Wednesday 09:00 Asia/Damascus ≈ 06:00Z
    const scheduledAt = new Date('2030-08-21T06:00:00.000Z');
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 11,
        scheduledAt,
        durationMinutes: 30,
        patient: { fullName: 'Sara' },
      },
    ]);

    await expect(
      service.createException(
        {
          date: '2030-08-21',
          isWorkingDay: false,
        },
        1,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.createException(
        {
          date: '2030-08-21',
          isWorkingDay: false,
        },
        1,
      ),
    ).rejects.toMatchObject({
      response: {
        message: ERROR_CODES.SCHEDULE_CHANGE_HAS_CONFLICTS,
        details: {
          affectedAppointments: [
            expect.objectContaining({
              id: 11,
              patientFullName: 'Sara',
            }),
          ],
        },
      },
    });
  });

  it('BR-50: allows conflicting exception when confirmed=true', async () => {
    const scheduledAt = new Date('2030-08-21T06:00:00.000Z');
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 11,
        scheduledAt,
        durationMinutes: 30,
        patient: { fullName: 'Sara' },
      },
    ]);
    prisma.clinicScheduleException.create.mockResolvedValue({
      id: 1,
      date: new Date(Date.UTC(2030, 7, 21)),
      isWorkingDay: false,
      startMinute: null,
      endMinute: null,
      breaks: [],
      reason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createException(
      {
        date: '2030-08-21',
        isWorkingDay: false,
        confirmed: true,
      },
      1,
    );

    expect(result.isWorkingDay).toBe(false);
    expect(prisma.clinicScheduleException.create).toHaveBeenCalled();
  });
});
