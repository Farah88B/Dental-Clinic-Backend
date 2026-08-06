import { distanceMeters, isWithinRadiusMeters } from './geo.helper';

describe('geo.helper', () => {
  it('returns ~0 for identical points', () => {
    expect(distanceMeters(33.5, 36.3, 33.5, 36.3)).toBeLessThan(1);
  });

  it('detects points inside and outside radius', () => {
    expect(
      isWithinRadiusMeters({
        clinicLat: 33.5138,
        clinicLng: 36.2765,
        deviceLat: 33.5139,
        deviceLng: 36.2766,
        radiusMeters: 150,
      }),
    ).toBe(true);

    expect(
      isWithinRadiusMeters({
        clinicLat: 33.5138,
        clinicLng: 36.2765,
        deviceLat: 33.7,
        deviceLng: 36.5,
        radiusMeters: 150,
      }),
    ).toBe(false);
  });
});
