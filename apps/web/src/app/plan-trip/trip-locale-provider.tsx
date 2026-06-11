'use client';

import { useEffect, useRef } from 'react';
import i18n from '@/i18n/client';

export function TripLocaleProvider({ children }: { children: React.ReactNode }) {
  const entryLang = useRef(i18n.language);

  useEffect(() => {
    entryLang.current = i18n.language;
    void i18n.changeLanguage('vi');

    return () => {
      void i18n.changeLanguage(entryLang.current);
    };
  }, []);

  return <>{children}</>;
}
