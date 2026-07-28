import { resolveLanguageFromRequest } from './helper';

describe('resolveLanguageFromRequest', () => {
  it('uses the authenticated account preference over the request header', () => {
    const language = resolveLanguageFromRequest({
      headers: { 'accept-language': 'en' },
      user: { preferredLanguage: 'ar' },
    } as any);

    expect(language).toBe('ar');
  });

  it('falls back to the header when no authenticated preference exists', () => {
    const language = resolveLanguageFromRequest({
      headers: { 'accept-language': 'en' },
    } as any);

    expect(language).toBe('en');
  });
});
