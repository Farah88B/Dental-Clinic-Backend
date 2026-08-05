import {
  computeAvailableSlotStarts,
  toBusyInterval,
} from './slot-algorithm.helper';

describe('slot-algorithm.helper', () => {
  it('returns 15-min starts inside a free window', () => {
    const starts = computeAvailableSlotStarts({
      freeWindows: [{ startMinute: 540, endMinute: 600 }], // 09:00–10:00
      busyIntervals: [],
      durationMinutes: 30,
    });
    expect(starts).toEqual([540, 555, 570]);
  });

  it('skips busy blocks and jumps to conflict end', () => {
    const starts = computeAvailableSlotStarts({
      freeWindows: [{ startMinute: 540, endMinute: 660 }], // 09:00–11:00
      busyIntervals: [toBusyInterval(555, 30, 0)], // 09:15–09:45
      durationMinutes: 30,
    });
    // 09:00–09:30 overlaps busy; algorithm jumps to 09:45
    expect(starts[0]).toBe(585);
    expect(starts).not.toContain(540);
    expect(starts).not.toContain(555);
    expect(starts).toContain(600);
  });

  it('applies buffer after appointments', () => {
    const starts = computeAvailableSlotStarts({
      freeWindows: [{ startMinute: 540, endMinute: 660 }],
      busyIntervals: [toBusyInterval(540, 30, 15)], // occupies until 10:15
      durationMinutes: 30,
    });
    expect(starts[0]).toBe(585); // 09:45
  });

  it('respects earliestStartMinute for today', () => {
    const starts = computeAvailableSlotStarts({
      freeWindows: [{ startMinute: 540, endMinute: 600 }],
      busyIntervals: [],
      durationMinutes: 30,
      earliestStartMinute: 560,
    });
    expect(starts[0]).toBe(570);
  });
});
