export function formatNotificationDateTime(
  date: Date,
  timeZone: string,
  lang: 'ar' | 'en',
): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SY' : 'en-GB', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
