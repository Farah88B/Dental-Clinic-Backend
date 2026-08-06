import { createHmac, timingSafeEqual } from 'crypto';

/** Build the printable clinic QR payload from a shared secret. */
export function buildClinicCheckInCode(secret: string): string {
  const digest = createHmac('sha256', secret)
    .update('clinic-checkin:v1')
    .digest('hex')
    .slice(0, 32);
  return `clinic-checkin.${digest}`;
}

export function isValidClinicCheckInCode(
  provided: string,
  secret: string,
): boolean {
  const expected = buildClinicCheckInCode(secret);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
