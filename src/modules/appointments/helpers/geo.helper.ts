/** Great-circle distance in meters (WGS84 sphere approximation). */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

export function isWithinRadiusMeters(input: {
  clinicLat: number;
  clinicLng: number;
  deviceLat: number;
  deviceLng: number;
  radiusMeters: number;
}): boolean {
  return (
    distanceMeters(
      input.clinicLat,
      input.clinicLng,
      input.deviceLat,
      input.deviceLng,
    ) <= input.radiusMeters
  );
}
