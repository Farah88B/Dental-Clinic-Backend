import { AppLanguage } from '@prisma/client';

export type UiLanguage = 'ar' | 'en';

export function toUiLanguage(
  lang: AppLanguage | string | undefined,
): UiLanguage {
  if (lang === AppLanguage.AR || lang === 'AR' || lang === 'ar') {
    return 'ar';
  }
  if (lang === AppLanguage.EN || lang === 'EN' || lang === 'en') {
    return 'en';
  }
  return 'ar';
}

export function pickLocalized(
  ar: string,
  en: string,
  lang: UiLanguage,
): string {
  return lang === 'ar' ? ar : en;
}
