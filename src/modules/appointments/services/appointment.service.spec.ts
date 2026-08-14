import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  AppointmentStatus,
  AppointmentType,
  TreatmentSessionStatus,
} from '@prisma/client';
import { APPOINTMENT_ERROR_CODES } from 'src/common/constants/appointment.constants';
import { PrismaService } from 'src/common/prisma/services/prisma.service';
import { ClinicScheduleService } from 'src/modules/clinic-schedule/services/clinic-schedule.service';
import { AppointmentAdapter } from '../adapter/appointment.adapter';
import { buildClinicCheckInCode } from '../helpers/clinic-checkin-code.helper';
import { AppointmentAvailabilityService } from './appointment-availability.service';
import { AppointmentNotificationService } from './appointment-notification.service';
import { AppointmentService } from './appointment.service';
import { NotificationRecipientService } from 'src/modules/notification/services/notification-recipient.service';

describe('AppointmentService', () => {
  let service: AppointmentService;

  const prisma = {
    patient: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn() },
    appointment: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    clinicSettings: { findFirstOrThrow: jest.fn() },
    treatmentSession: {
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const availability = {
    assertPatientAccess: jest.fn(),
    loadSettings: jest.fn(),
    assertOnlineBookingIfApp: jest.fn(),
    loadBookableSession: jest.fn(),
    isSlotAvailable: jest.fn(),
  };

  const adapter = {
    adapt: jest.fn((raw) => raw),
  };

  const configGet = jest.fn((key: string) => {
    if (key === 'clinic.timezone') return 'Asia/Damascus';
    if (key === 'clinic.checkInQrSecret') return 'test-clinic-checkin-secret';
    return undefined;
  });

  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const notificationRecipients = {
    dispatchSafely: jest.fn(),
  };

  const appointmentNotifications = {
    onCreated: jest.fn().mockResolvedValue(undefined),
    onConfirmed: jest.fn().mockResolvedValue(undefined),
    onCancelled: jest.fn().mockResolvedValue(undefined),
    onRescheduled: jest.fn().mockResolvedValue(undefined),
    onCheckedInFromApp: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppointmentAvailabilityService, useValue: availability },
        { provide: AppointmentAdapter, useValue: adapter },
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
        { provide: ClinicScheduleService, useValue: {} },
        {
          provide: AppointmentNotificationService,
          useValue: appointmentNotifications,
        },
        {
          provide: NotificationRecipientService,
          useValue: notificationRecipients,
        },
      ],
    }).compile();

    service = moduleRef.get(AppointmentService);

    availability.assertPatientAccess.mockResolvedValue(undefined);
    availability.assertOnlineBookingIfApp.mockReturnValue(undefined);
    availability.loadSettings.mockResolvedValue({
      bufferTimeMinutes: 0,
      defaultConsultationDurationMinutes: 30,
      maxBookingHorizonDays: 10000,
      onlineBookingEnabled: true,
      autoConfirmationEnabled: false,
      cancelRescheduleWindowHours: 24,
    });
    availability.isSlotAvailable.mockResolvedValue(true);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.appointment.create.mockResolvedValue({
      id: 1,
      patientId: 7,
      type: AppointmentType.CONSULTATION,
      status: AppointmentStatus.PENDING_CONFIRMATION,
      scheduledAt: new Date('2030-08-20T06:00:00.000Z'),
      durationMinutes: 30,
      createdById: 1,
      treatmentSessionId: null,
      confirmedById: null,
      cancelledById: null,
      rescheduledById: null,
      isWaiting: false,
      reasonForVisit: null,
      chatbotSummary: null,
      notes: null,
      confirmedAt: null,
      cancellationReason: null,
      cancelledAt: null,
      rescheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('create', () => {
    it('rejects a new consultation when an incomplete one exists', async () => {
      prisma.appointment.findFirst.mockResolvedValue({ id: 99 });

      await expect(
        service.createFromApp(
          {
            patientId: 7,
            type: AppointmentType.CONSULTATION,
            scheduledAt: '2030-08-20T06:00:00.000Z',
          },
          1,
        ),
      ).rejects.toThrow(APPOINTMENT_ERROR_CODES.ACTIVE_CONSULTATION_EXISTS);
    });

    it('creates a consultation when none is active', async () => {
      const result = await service.createFromApp(
        {
          patientId: 7,
          type: AppointmentType.CONSULTATION,
          scheduledAt: '2030-08-20T06:00:00.000Z',
          reasonForVisit: 'pain',
        },
        1,
      );

      expect(result.id).toBe(1);
      expect(prisma.appointment.create).toHaveBeenCalled();
    });
  });

  describe('reschedule', () => {
    function mockOwnedAppointment(overrides: Record<string, unknown> = {}) {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        patientId: 7,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: farFuture,
        durationMinutes: 30,
        treatmentSessionId: null,
        patient: { accountId: 1 },
        ...overrides,
      });
    }

    it('keeps status and updates scheduledAt within the window', async () => {
      mockOwnedAppointment();
      const newAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      prisma.appointment.update.mockResolvedValue({
        id: 10,
        patientId: 7,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: newAt,
        durationMinutes: 30,
        treatmentSessionId: null,
        createdById: 1,
        confirmedById: 1,
        cancelledById: null,
        rescheduledById: 1,
        type: AppointmentType.CONSULTATION,
        isWaiting: false,
        reasonForVisit: null,
        chatbotSummary: null,
        notes: null,
        confirmedAt: new Date(),
        cancellationReason: null,
        cancelledAt: null,
        rescheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.rescheduleFromApp(
        10,
        { scheduledAt: newAt.toISOString() },
        1,
      );

      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
      expect(availability.isSlotAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ excludeAppointmentId: 10 }),
      );
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rescheduledById: 1,
          }),
        }),
      );
    });

    it('rejects app reschedule outside the window', async () => {
      mockOwnedAppointment({ scheduledAt: soon });

      await expect(
        service.rescheduleFromApp(
          10,
          { scheduledAt: farFuture.toISOString() },
          1,
        ),
      ).rejects.toThrow(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_OUTSIDE_CANCEL_RESCHEDULE_WINDOW,
      );
    });

    it('allows dashboard reschedule outside the patient window', async () => {
      mockOwnedAppointment({ scheduledAt: soon });
      prisma.appointment.update.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: farFuture,
        patientId: 7,
        durationMinutes: 30,
        treatmentSessionId: null,
        createdById: 2,
        confirmedById: 2,
        cancelledById: null,
        rescheduledById: 2,
        type: AppointmentType.CONSULTATION,
        isWaiting: false,
        reasonForVisit: null,
        chatbotSummary: null,
        notes: null,
        confirmedAt: new Date(),
        cancellationReason: null,
        cancelledAt: null,
        rescheduledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.rescheduleFromDashboard(
          10,
          { scheduledAt: farFuture.toISOString() },
          2,
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('cancel', () => {
    it('sets CANCELLED and reverts BOOKED session to PENDING (EC-3)', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        patientId: 7,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: farFuture,
        durationMinutes: 30,
        treatmentSessionId: 55,
        patient: { accountId: 1 },
      });
      prisma.treatmentSession.findUnique.mockResolvedValue({
        id: 55,
        status: TreatmentSessionStatus.BOOKED,
      });
      prisma.appointment.update.mockResolvedValue({
        id: 10,
        patientId: 7,
        status: AppointmentStatus.CANCELLED,
        scheduledAt: farFuture,
        durationMinutes: 30,
        treatmentSessionId: 55,
        createdById: 1,
        confirmedById: 1,
        cancelledById: 1,
        rescheduledById: null,
        type: AppointmentType.FOLLOW_UP,
        isWaiting: false,
        reasonForVisit: null,
        chatbotSummary: null,
        notes: null,
        confirmedAt: new Date(),
        cancellationReason: 'changed plans',
        cancelledAt: new Date(),
        rescheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.cancelFromApp(
        10,
        { cancellationReason: 'changed plans' },
        1,
      );

      expect(result.status).toBe(AppointmentStatus.CANCELLED);
      expect(prisma.treatmentSession.update).toHaveBeenCalledWith({
        where: { id: 55 },
        data: { status: TreatmentSessionStatus.PENDING },
      });
    });

    it('does not change a session that is already PENDING', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        patientId: 7,
        status: AppointmentStatus.PENDING_CONFIRMATION,
        scheduledAt: farFuture,
        durationMinutes: 30,
        treatmentSessionId: 55,
        patient: { accountId: 1 },
      });
      prisma.treatmentSession.findUnique.mockResolvedValue({
        id: 55,
        status: TreatmentSessionStatus.PENDING,
      });
      prisma.appointment.update.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CANCELLED,
        patientId: 7,
        scheduledAt: farFuture,
        durationMinutes: 30,
        treatmentSessionId: 55,
        createdById: 1,
        confirmedById: null,
        cancelledById: 1,
        rescheduledById: null,
        type: AppointmentType.FOLLOW_UP,
        isWaiting: false,
        reasonForVisit: null,
        chatbotSummary: null,
        notes: null,
        confirmedAt: null,
        cancellationReason: null,
        cancelledAt: new Date(),
        rescheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.cancelFromApp(10, {}, 1);

      expect(prisma.treatmentSession.update).not.toHaveBeenCalled();
    });

    it('rejects app cancel outside the window', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        patientId: 7,
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: soon,
        durationMinutes: 30,
        treatmentSessionId: null,
        patient: { accountId: 1 },
      });

      await expect(service.cancelFromApp(10, {}, 1)).rejects.toThrow(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_OUTSIDE_CANCEL_RESCHEDULE_WINDOW,
      );
    });

    it('rejects cancel when status is not mutable', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        patientId: 7,
        status: AppointmentStatus.CHECKED_IN,
        scheduledAt: farFuture,
        durationMinutes: 30,
        treatmentSessionId: null,
        patient: { accountId: 1 },
      });

      await expect(service.cancelFromApp(10, {}, 1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.cancelFromApp(10, {}, 1)).rejects.toThrow(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_NOT_CANCELLABLE,
      );
    });
  });

  describe('confirm / reject / check-in', () => {
    it('confirms pending appointment and books linked session', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.PENDING_CONFIRMATION,
        treatmentSessionId: 55,
      });
      prisma.appointment.update.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
      });

      const result = await service.confirmFromDashboard(10, 2);

      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
      expect(prisma.treatmentSession.update).toHaveBeenCalledWith({
        where: { id: 55 },
        data: { status: TreatmentSessionStatus.BOOKED },
      });
    });

    it('rejects confirm when status is not pending', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
        treatmentSessionId: null,
      });

      await expect(service.confirmFromDashboard(10, 2)).rejects.toThrow(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_NOT_CONFIRMABLE,
      );
    });

    it('rejects reject when status is not pending', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
        treatmentSessionId: null,
      });

      await expect(
        service.rejectFromDashboard(10, {}, 2),
      ).rejects.toThrow(APPOINTMENT_ERROR_CODES.APPOINTMENT_NOT_REJECTABLE);
    });

    it('checks in a confirmed appointment from dashboard', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
      });
      prisma.appointment.update.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CHECKED_IN,
      });

      const result = await service.checkInFromDashboard(10, 2);

      expect(result.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AppointmentStatus.CHECKED_IN,
            checkedInById: 2,
          }),
        }),
      );
    });

    it('rejects check-in when not confirmed', async () => {
      prisma.appointment.findUniqueOrThrow.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.PENDING_CONFIRMATION,
      });

      await expect(service.checkInFromDashboard(10, 2)).rejects.toThrow(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_NOT_CHECKABLE,
      );
    });

    it('checks in from app QR within geofence', async () => {
      const code = buildClinicCheckInCode('test-clinic-checkin-secret');

      prisma.patient.findUnique.mockResolvedValue({ id: 7 });
      prisma.clinicSettings.findFirstOrThrow.mockResolvedValue({
        latitude: 33.5138,
        longitude: 36.2765,
        checkInRadiusMeters: 150,
      });
      prisma.appointment.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: 10,
          patientId: 7,
          status: AppointmentStatus.CONFIRMED,
        })
        .mockResolvedValueOnce({
          id: 10,
          status: AppointmentStatus.CONFIRMED,
        });
      prisma.appointment.update.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CHECKED_IN,
      });

      const result = await service.checkInFromApp(
        {
          patientId: 7,
          clinicCheckInCode: code,
          latitude: 33.5138,
          longitude: 36.2765,
          appointmentId: 10,
        },
        1,
      );

      expect(result.status).toBe(AppointmentStatus.CHECKED_IN);
    });

    it('rejects app check-in outside geofence', async () => {
      const code = buildClinicCheckInCode('test-clinic-checkin-secret');

      prisma.patient.findUnique.mockResolvedValue({ id: 7 });
      prisma.clinicSettings.findFirstOrThrow.mockResolvedValue({
        latitude: 33.5138,
        longitude: 36.2765,
        checkInRadiusMeters: 150,
      });

      await expect(
        service.checkInFromApp(
          {
            patientId: 7,
            clinicCheckInCode: code,
            latitude: 33.7,
            longitude: 36.5,
            appointmentId: 10,
          },
          1,
        ),
      ).rejects.toThrow(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_CHECKIN_OUTSIDE_GEOFENCE,
      );
    });

    it('rejects invalid clinic check-in code', async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: 7 });

      await expect(
        service.checkInFromApp(
          {
            patientId: 7,
            clinicCheckInCode: 'clinic-checkin.invalid',
            latitude: 33.5138,
            longitude: 36.2765,
            appointmentId: 10,
          },
          1,
        ),
      ).rejects.toThrow(
        APPOINTMENT_ERROR_CODES.APPOINTMENT_CHECKIN_CODE_INVALID,
      );
    });
  });
});
