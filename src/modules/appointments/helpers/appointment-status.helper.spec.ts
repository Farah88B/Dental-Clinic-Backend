import { AppointmentStatus } from '@prisma/client';
import { resolveInitialAppointmentStatus } from './appointment-status.helper';

describe('resolveInitialAppointmentStatus', () => {
  it('always confirms dashboard bookings', () => {
    expect(
      resolveInitialAppointmentStatus({
        source: 'DASHBOARD',
        autoConfirmationEnabled: false,
      }),
    ).toBe(AppointmentStatus.CONFIRMED);
  });

  it('uses clinic auto-confirm for app bookings', () => {
    expect(
      resolveInitialAppointmentStatus({
        source: 'APP',
        autoConfirmationEnabled: true,
      }),
    ).toBe(AppointmentStatus.CONFIRMED);

    expect(
      resolveInitialAppointmentStatus({
        source: 'APP',
        autoConfirmationEnabled: false,
      }),
    ).toBe(AppointmentStatus.PENDING_CONFIRMATION);
  });
});
