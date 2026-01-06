import { detectUserLanguage, detectUserLanguageAlternative, getLanguageFromCountry } from '@/lib/geolocation';

describe('geolocation language detection', () => {
  it('maps country codes to languages with fallback', () => {
    expect(getLanguageFromCountry('US')).toBe('en');
    expect(getLanguageFromCountry('es')).toBe('es');
    expect(getLanguageFromCountry('pt')).toBe('pt');
    expect(getLanguageFromCountry('xx' as any)).toBe('en');
  });

  it('detectUserLanguage uses ipapi and returns en for US', async () => {
    await expect(detectUserLanguage()).resolves.toBe('en');
  });

  it('detectUserLanguageAlternative uses ipgeolocation and returns pt for BR', async () => {
    await expect(detectUserLanguageAlternative()).resolves.toBe('pt');
  });
});

