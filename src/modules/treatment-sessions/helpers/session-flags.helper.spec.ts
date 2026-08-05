import { AppointmentStatus, TreatmentSessionStatus } from '@prisma/client';
import {
  computeCanBook,
  computeCanTreat,
  resolveNextBookableSessionId,
} from './session-flags.helper';

describe('session-flags.helper', () => {
  const planSessions = [
    { id: 1, sessionOrder: 1, status: TreatmentSessionStatus.COMPLETED },
    { id: 2, sessionOrder: 2, status: TreatmentSessionStatus.COMPLETED },
    { id: 3, sessionOrder: 3, status: TreatmentSessionStatus.PENDING },
    { id: 4, sessionOrder: 4, status: TreatmentSessionStatus.PENDING },
    { id: 5, sessionOrder: 5, status: TreatmentSessionStatus.BOOKED },
  ];

  describe('resolveNextBookableSessionId', () => {
    it('returns next after last completed', () => {
      expect(resolveNextBookableSessionId(planSessions)).toBe(3);
    });

    it('returns first PENDING when none completed', () => {
      expect(
        resolveNextBookableSessionId([
          { id: 10, sessionOrder: 1, status: TreatmentSessionStatus.PENDING },
          { id: 11, sessionOrder: 2, status: TreatmentSessionStatus.PENDING },
        ]),
      ).toBe(10);
    });

    it('skips BOOKED and picks next PENDING when none completed', () => {
      expect(
        resolveNextBookableSessionId([
          { id: 20, sessionOrder: 1, status: TreatmentSessionStatus.BOOKED },
          { id: 21, sessionOrder: 2, status: TreatmentSessionStatus.PENDING },
          { id: 22, sessionOrder: 3, status: TreatmentSessionStatus.PENDING },
        ]),
      ).toBe(21);
    });

    it('skips cancelled between completed and next', () => {
      expect(
        resolveNextBookableSessionId([
          { id: 1, sessionOrder: 1, status: TreatmentSessionStatus.COMPLETED },
          { id: 2, sessionOrder: 2, status: TreatmentSessionStatus.CANCELLED },
          { id: 3, sessionOrder: 3, status: TreatmentSessionStatus.PENDING },
        ]),
      ).toBe(3);
    });
  });

  describe('computeCanBook', () => {
    it('true for next PENDING without active appointment', () => {
      expect(
        computeCanBook(
          { id: 3, status: TreatmentSessionStatus.PENDING },
          planSessions,
          false,
        ),
      ).toBe(true);
    });

    it('false when not next after completed', () => {
      expect(
        computeCanBook(
          { id: 4, status: TreatmentSessionStatus.PENDING },
          planSessions,
          false,
        ),
      ).toBe(false);
    });

    it('false when active appointment exists (e.g. PENDING_CONFIRMATION)', () => {
      expect(
        computeCanBook(
          { id: 3, status: TreatmentSessionStatus.PENDING },
          planSessions,
          true,
        ),
      ).toBe(false);
    });

    it('false when status is not PENDING', () => {
      expect(
        computeCanBook(
          { id: 5, status: TreatmentSessionStatus.BOOKED },
          planSessions,
          false,
        ),
      ).toBe(false);
    });
  });

  describe('computeCanTreat', () => {
    it('true when BOOKED + CONFIRMED', () => {
      expect(
        computeCanTreat(
          { status: TreatmentSessionStatus.BOOKED },
          { status: AppointmentStatus.CONFIRMED },
        ),
      ).toBe(true);
    });

    it('true when BOOKED + CHECKED_IN', () => {
      expect(
        computeCanTreat(
          { status: TreatmentSessionStatus.BOOKED },
          { status: AppointmentStatus.CHECKED_IN },
        ),
      ).toBe(true);
    });

    it('false when BOOKED + PENDING_CONFIRMATION', () => {
      expect(
        computeCanTreat(
          { status: TreatmentSessionStatus.BOOKED },
          { status: AppointmentStatus.PENDING_CONFIRMATION },
        ),
      ).toBe(false);
    });

    it('false when PENDING even with CONFIRMED appointment', () => {
      expect(
        computeCanTreat(
          { status: TreatmentSessionStatus.PENDING },
          { status: AppointmentStatus.CONFIRMED },
        ),
      ).toBe(false);
    });
  });
});
