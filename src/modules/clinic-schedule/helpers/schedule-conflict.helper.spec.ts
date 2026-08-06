import {
  appointmentFitsWorkingWindow,
  collectConflictingAppointments,
} from './schedule-conflict.helper';

describe('schedule-conflict.helper', () => {
  const openDay = {
    isWorkingDay: true,
    startMinute: 540,
    endMinute: 1020,
    breaks: [{ startMinute: 720, endMinute: 780 }],
  };

  it('accepts appointments fully inside a free window', () => {
    expect(appointmentFitsWorkingWindow(540, 30, openDay)).toBe(true);
    expect(appointmentFitsWorkingWindow(780, 30, openDay)).toBe(true);
  });

  it('rejects appointments that spill into a break or outside hours', () => {
    expect(appointmentFitsWorkingWindow(700, 30, openDay)).toBe(false);
    expect(appointmentFitsWorkingWindow(1000, 30, openDay)).toBe(false);
    expect(
      appointmentFitsWorkingWindow(540, 30, {
        isWorkingDay: false,
        startMinute: null,
        endMinute: null,
        breaks: [],
      }),
    ).toBe(false);
  });

  it('collects conflicting appointments via resolveWindow', () => {
    const affected = collectConflictingAppointments({
      appointments: [
        {
          id: 1,
          scheduledAt: new Date(),
          durationMinutes: 30,
          patientFullName: 'A',
          startMinute: 540,
        },
        {
          id: 2,
          scheduledAt: new Date(),
          durationMinutes: 30,
          patientFullName: 'B',
          startMinute: 710,
        },
      ],
      resolveWindow: () => openDay,
    });

    expect(affected.map((a) => a.id)).toEqual([2]);
  });
});
