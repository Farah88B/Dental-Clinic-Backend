import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppointmentType } from '@prisma/client';
import { APPOINTMENT_ERROR_CODES } from 'src/common/constants/appointment.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ClinicScheduleService } from 'src/modules/clinic-schedule/services/clinic-schedule.service';
import { AppointmentAvailabilityService } from './appointment-availability.service';

describe('AppointmentAvailabilityService', () => {
  let service: AppointmentAvailabilityService;

  const prisma = {
    appointment: { findFirst: jest.fn() },
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
});
