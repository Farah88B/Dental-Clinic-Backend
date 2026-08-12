import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  AppointmentType,
  TreatmentPlanStatus,
  TreatmentSessionStatus,
} from '@prisma/client';
import { APPOINTMENT_ERROR_CODES } from 'src/common/constants/appointment.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ClinicScheduleService } from 'src/modules/clinic-schedule/services/clinic-schedule.service';
import { AppointmentAvailabilityService } from './appointment-availability.service';

describe('AppointmentAvailabilityService', () => {
  let service: AppointmentAvailabilityService;

  const prisma = {
    appointment: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
    },
    patient: { findUniqueOrThrow: jest.fn() },
    clinicSettings: { findFirstOrThrow: jest.fn() },
    treatmentSession: { findUniqueOrThrow: jest.fn() },
  };

  const clinicSchedule = {
    resolveWorkingWindow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppointmentAvailabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClinicScheduleService, useValue: clinicSchedule },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('Asia/Damascus'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AppointmentAvailabilityService);

    prisma.patient.findUniqueOrThrow.mockResolvedValue({
      id: 7,
      status: 'ACTIVE',
    });
    prisma.clinicSettings.findFirstOrThrow.mockResolvedValue({
      bufferTimeMinutes: 0,
      defaultConsultationDurationMinutes: 30,
      maxBookingHorizonDays: 30,
      onlineBookingEnabled: true,
      autoConfirmationEnabled: false,
      cancelRescheduleWindowHours: 24,
    });
    prisma.appointment.findMany.mockResolvedValue([]);
    clinicSchedule.resolveWorkingWindow.mockResolvedValue({
      isWorkingDay: true,
      startMinute: 9 * 60,
      endMinute: 17 * 60,
      breaks: [],
    });
  });

  it('throws ACTIVE_CONSULTATION_EXISTS on days when an open consultation exists', async () => {
    prisma.appointment.findFirst.mockResolvedValue({ id: 99 });

    await expect(
      service.getBookableDays(
        {
          patientId: 7,
          type: AppointmentType.CONSULTATION,
          month: 8,
          year: 2030,
        },
        { source: 'DASHBOARD' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.getBookableDays(
        {
          patientId: 7,
          type: AppointmentType.CONSULTATION,
          month: 8,
          year: 2030,
        },
        { source: 'DASHBOARD' },
      ),
    ).rejects.toThrow(APPOINTMENT_ERROR_CODES.ACTIVE_CONSULTATION_EXISTS);
  });

  it('throws ACTIVE_CONSULTATION_EXISTS on slots when an open consultation exists', async () => {
    prisma.appointment.findFirst.mockResolvedValue({ id: 99 });

    await expect(
      service.getAvailableSlots(
        {
          patientId: 7,
          type: AppointmentType.CONSULTATION,
          date: '2030-08-20',
        },
        { source: 'DASHBOARD' },
      ),
    ).rejects.toThrow(APPOINTMENT_ERROR_CODES.ACTIVE_CONSULTATION_EXISTS);
  });

  it('does not throw ACTIVE_CONSULTATION_EXISTS when excluding the open consultation', async () => {
    prisma.appointment.findUniqueOrThrow.mockResolvedValue({
      patientId: 7,
      type: AppointmentType.CONSULTATION,
      treatmentSessionId: null,
    });
    prisma.appointment.findFirst.mockResolvedValue(null);

    await expect(
      service.getAvailableSlots(
        {
          patientId: 7,
          type: AppointmentType.CONSULTATION,
          date: '2030-08-20',
          excludeAppointmentId: 99,
        },
        { source: 'DASHBOARD' },
      ),
    ).resolves.toEqual(expect.any(Array));

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 99 },
        }),
      }),
    );
  });

  it('throws APPOINTMENT_SESSION_NOT_BOOKABLE for BOOKED session without exclude', async () => {
    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue({
      id: 3,
      status: TreatmentSessionStatus.BOOKED,
      durationMinutes: 45,
      availableForBookingAt: null,
      treatmentPlan: {
        patientId: 7,
        status: TreatmentPlanStatus.ACTIVE,
        sessions: [
          {
            id: 3,
            sessionOrder: 1,
            status: TreatmentSessionStatus.BOOKED,
          },
        ],
      },
      appointments: [{ id: 55 }],
    });

    await expect(
      service.getAvailableSlots(
        {
          patientId: 7,
          type: AppointmentType.FOLLOW_UP,
          treatmentSessionId: 3,
          date: '2030-08-20',
        },
        { source: 'DASHBOARD' },
      ),
    ).rejects.toThrow(APPOINTMENT_ERROR_CODES.APPOINTMENT_SESSION_NOT_BOOKABLE);
  });

  it('allows BOOKED session availability when excluding its active appointment', async () => {
    prisma.appointment.findUniqueOrThrow.mockResolvedValue({
      patientId: 7,
      type: AppointmentType.FOLLOW_UP,
      treatmentSessionId: 3,
    });
    prisma.treatmentSession.findUniqueOrThrow.mockResolvedValue({
      id: 3,
      status: TreatmentSessionStatus.BOOKED,
      durationMinutes: 45,
      availableForBookingAt: null,
      treatmentPlan: {
        patientId: 7,
        status: TreatmentPlanStatus.ACTIVE,
        sessions: [
          {
            id: 3,
            sessionOrder: 1,
            status: TreatmentSessionStatus.BOOKED,
          },
        ],
      },
      appointments: [],
    });

    await expect(
      service.getAvailableSlots(
        {
          patientId: 7,
          type: AppointmentType.FOLLOW_UP,
          treatmentSessionId: 3,
          date: '2030-08-20',
          excludeAppointmentId: 55,
        },
        { source: 'DASHBOARD' },
      ),
    ).resolves.toEqual(expect.any(Array));

    expect(prisma.treatmentSession.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          appointments: expect.objectContaining({
            where: expect.objectContaining({
              id: { not: 55 },
            }),
          }),
        }),
      }),
    );
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 55 },
        }),
      }),
    );
  });
});
