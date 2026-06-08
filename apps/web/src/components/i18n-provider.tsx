'use client';

import { I18nextProvider } from 'react-i18next';
import { useEffect } from 'react';
import i18n, { LOCALE_STORAGE_KEY, type Locale, SUPPORTED_LOCALES } from '@/i18n/client';

function isLocale(value: string | null): value is Locale {
  return value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved) && saved !== i18n.language) {
      void i18n.changeLanguage(saved);
    }
  }, []);

  useEffect(() => {
    const onChange = (lng: string) => {
      document.documentElement.lang = lng;
      localStorage.setItem(LOCALE_STORAGE_KEY, lng);
      document.title = i18n.t('common.meta.title');
    };
    onChange(i18n.language);
    i18n.on('languageChanged', onChange);
    return () => {
      i18n.off('languageChanged', onChange);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
