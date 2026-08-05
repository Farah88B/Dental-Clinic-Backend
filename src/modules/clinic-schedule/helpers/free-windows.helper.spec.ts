import { getFreeWindows } from 'src/modules/clinic-schedule/helpers/free-windows.helper';

describe('getFreeWindows', () => {
  it('subtracts breaks from the working window', () => {
    expect(
      getFreeWindows({
        isWorkingDay: true,
        startMinute: 540,
        endMinute: 1020,
        breaks: [{ startMinute: 720, endMinute: 780 }],
      }),
    ).toEqual([
      { startMinute: 540, endMinute: 720 },
      { startMinute: 780, endMinute: 1020 },
    ]);
  });

  it('returns empty for non-working days', () => {
    expect(
      getFreeWindows({
        isWorkingDay: false,
        startMinute: null,
        endMinute: null,
        breaks: [],
      }),
    ).toEqual([]);
  });
});
